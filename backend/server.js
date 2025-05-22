const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch((err) => {
    console.error('Failed to create uploads directory:', err);
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.users.findUnique({
            where: { idUser: decoded.idUser },
            include: { nsu: true },
        });
        if (!user) return res.status(401).json({ error: 'Invalid token' });
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

app.use('/uploads', express.static(uploadsDir));


// Register a new user
app.post('/register', async (req, res) => {
    const { email, password, realName, group, displayedName } = req.body;

    try {
        const existingNsu = await prisma.nsu.findUnique({ where: { email } });
        if (existingNsu) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const nsu = await prisma.nsu.create({
            data: {
                realName,
                email,
                group,
                user: {
                    create: {
                        displayedName,
                        password: hashedPassword,
                    },
                },
            },
            include: { user: true },
        });

        const token = jwt.sign({ idUser: nsu.idNsuUser }, JWT_SECRET, { expiresIn: '99999d' });

        res.json({ user: nsu.user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login a user
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const nsu = await prisma.nsu.findUnique({
            where: { email },
            include: { user: true },
        });
        if (!nsu || !nsu.user) return res.status(401).json({ error: 'Invalid credentials' });

        const isValid = await bcrypt.compare(password, nsu.user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        await prisma.nsu.update({
            where: { idNsuUser: nsu.idNsuUser },
            data: { hasLogined: true },
        });

        const token = jwt.sign({ idUser: nsu.idNsuUser }, JWT_SECRET, { expiresIn: '999999d' });

        res.json({ user: nsu.user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Logout (client-side token removal is handled, server confirms)
app.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Get current user
app.get('/current-user', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: { idUser: req.user.idUser },
            include: { nsu: true },
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Update current user (username or image)
app.post('/current-user', authenticateToken, async (req, res) => {
    const { username, imageBase64 } = req.body;

    try {
        const updateData = {};
        if (username) updateData.displayedName = username;
        if (imageBase64) updateData.pic = imageBase64;

        const user = await prisma.users.update({
            where: { idUser: req.user.idUser },
            data: updateData,
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Get user by ID
app.get('/user/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { full } = req.query;

    try {
        const user = await prisma.users.findUnique({
            where: { idUser: parseInt(id) },
            include: { nsu: full === 'true' },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create a post
app.post('/posts', authenticateToken, async (req, res) => {
    const { content, images, tags, iframe } = req.body;

    try {
        let imagePaths = [];
        if (images && Array.isArray(images)) {
            imagePaths = await Promise.all(
                images.map(async (image) => {
                    const { name, base64 } = image;
                    const filePath = path.join(uploadsDir, name);
                    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
                    await fs.writeFile(filePath, base64Data, 'base64');
                    return `/uploads/${name}`;
                })
            );
        }

        const post = await prisma.post.create({
            data: {
                content,
                iframe: iframe || null,
                images: imagePaths.length > 0 ? imagePaths.join(',') : null,
                tags,
                createdByIdUser: req.user.idUser,
            },
        });

        res.json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// Get all posts
app.get('/posts', authenticateToken, async (req, res) => {
    const { page = 1, pageSize = 10 } = req.query;

    try {
        const posts = await prisma.post.findMany({
            skip: (page - 1) * pageSize,
            take: parseInt(pageSize),
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: true,
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
                iframe: true, // Include iframeHtml field
                createdById: true,
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        displayedName: true,
                        pic: true,
                    }
                }
            }
        });

        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Get a single post
app.get('/post/:postId', authenticateToken, async (req, res) => {
    const { postId } = req.params;

    try {
        const post = await prisma.post.findUnique({
            where: { idPost: parseInt(postId) },
            include: { createdBy: true, comments: { include: { createdBy: true } } },
        });
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // Increment views
        await prisma.post.update({
            where: { idPost: parseInt(postId) },
            data: { views: { increment: 1 } },
        });

        // Record view
        await prisma.userViewedPost.upsert({
            where: { idUser_idPost: { idUser: req.user.idUser, idPost: parseInt(postId) } },
            update: {},
            create: { idUser: req.user.idUser, idPost: parseInt(postId) },
        });

        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// Delete a post
app.delete('/posts', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    try {
        const post = await prisma.post.findUnique({
            where: { idPost: postId },
        });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.createdByIdUser !== req.user.idUser) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.post.delete({
            where: { idPost: postId },
        });
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Get posts from followed tags
app.get('/following-posts', authenticateToken, async (req, res) => {
    const { page = 1, pageSize = 10 } = req.query;

    try {
        const followedTags = await prisma.userFollowedTag.findMany({
            where: { idUser: req.user.idUser },
            include: { tag: true },
        });
        const tagNames = followedTags.map((ft) => ft.tag.name);

        const posts = await prisma.post.findMany({
            where: {
                tags: { contains: tagNames.join(',') },
            },
            skip: (page - 1) * pageSize,
            take: parseInt(pageSize),
            orderBy: { createdAt: 'desc' },
            include: { createdBy: true },
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch following posts' });
    }
});

// Get all comments
app.get('/comments', authenticateToken, async (req, res) => {
    const { page = 1, pageSize = 10 } = req.query;

    try {
        const comments = await prisma.comment.findMany({
            skip: (page - 1) * pageSize,
            take: parseInt(pageSize),
            orderBy: { createdAt: 'desc' },
            include: { createdBy: true, post: true },
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Get comments for a post
app.get('/post/:postId/comments', authenticateToken, async (req, res) => {
    const { postId } = req.params;

    try {
        const comments = await prisma.comment.findMany({
            where: { commentIdPost: parseInt(postId) },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: true },
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Get comment count for a post
app.get('/post/:postId/comments-count', authenticateToken, async (req, res) => {
    const { postId } = req.params;

    try {
        const count = await prisma.comment.count({
            where: { commentIdPost: parseInt(postId) },
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comment count' });
    }
});

// Add a comment
app.post('/comments', authenticateToken, async (req, res) => {
    const { postId, content, isAnonymous, imageBase64 } = req.body;

    try {
        const comment = await prisma.comment.create({
            data: {
                commentIdPost: parseInt(postId),
                text: content,
                images: imageBase64,
                createdByIdUser: isAnonymous ? 2 : req.user.idUser,
            },
        });
        res.json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add comment', message: error.message });
    }
});

// Like a post
app.post('/like-post', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    try {
        const like = await prisma.userLikedPost.upsert({
            where: { idUser_idPost: { idUser: req.user.idUser, idPost: parseInt(postId) } },
            update: {},
            create: { idUser: req.user.idUser, idPost: parseInt(postId) },
        });

        await prisma.post.update({
            where: { idPost: parseInt(postId) },
            data: { likes: { increment: 1 } },
        });

        res.json(like);
    } catch (error) {
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// Get like status for a post
app.get('/like-post', authenticateToken, async (req, res) => {
    const { idPost } = req.query;

    try {
        const like = await prisma.userLikedPost.findUnique({
            where: { idUser_idPost: { idUser: req.user.idUser, idPost: parseInt(idPost) } },
        });
        res.json(!!like);
        console.log()
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch like status' });
    }
});

// Unlike a post
app.post('/unlike-post', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    try {
        await prisma.userLikedPost.delete({
            where: { idUser_idPost: { idUser: req.user.idUser, idPost: parseInt(postId) } },
        });

        await prisma.post.update({
            where: { idPost: parseInt(postId) },
            data: { likes: { decrement: 1 } },
        });

        res.json({ message: 'Post unliked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlike post' });
    }
});

// Get comment likes
app.post('/get-comment-likes', authenticateToken, async (req, res) => {
    const { commentId } = req.body;

    try {
        const likes = await prisma.userLikedComment.findMany({
            where: { idComment: parseInt(commentId) },
        });
        res.json(likes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comment likes' });
    }
});

// Like a comment
app.post('/like-comment', authenticateToken, async (req, res) => {
    const { commentId } = req.body;

    try {
        const like = await prisma.userLikedComment.upsert({
            where: { idUser_idComment: { idUser: req.user.idUser, idComment: parseInt(commentId) } },
            update: {},
            create: { idUser: req.user.idUser, idComment: parseInt(commentId) },
        });

        await prisma.comment.update({
            where: { idComment: parseInt(commentId) },
            data: { likes: { increment: 1 } },
        });

        res.json(like);
    } catch (error) {
        res.status(500).json({ error: 'Failed to like comment' });
    }
});

// Unlike a comment
app.post('/unlike-comment', authenticateToken, async (req, res) => {
    const { commentId } = req.body;

    try {
        await prisma.userLikedComment.delete({
            where: { idUser_idComment: { idUser: req.user.idUser, idComment: parseInt(commentId) } },
        });

        await prisma.comment.update({
            where: { idComment: parseInt(commentId) },
            data: { likes: { decrement: 1 } },
        });

        res.json({ message: 'Comment unliked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlike comment' });
    }
});

// Follow a tag
app.post('/follow-tag', authenticateToken, async (req, res) => {
    const { tagName } = req.body;

    try {
        const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
        });

        const follow = await prisma.userFollowedTag.upsert({
            where: { idUser_idTag: { idUser: req.user.idUser, idTag: tag.idTag } },
            update: {},
            create: { idUser: req.user.idUser, idTag: tag.idTag },
        });

        res.json(follow);
    } catch (error) {
        res.status(500).json({ error: 'Failed to follow tag' });
    }
});

// Unfollow a tag
app.post('/unfollow-tag', authenticateToken, async (req, res) => {
    const { tagName } = req.body;

    try {
        const tag = await prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) return res.status(404).json({ error: 'Tag not found' });

        await prisma.userFollowedTag.delete({
            where: { idUser_idTag: { idUser: req.user.idUser, idTag: tag.idTag } },
        });

        res.json({ message: 'Tag unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unfollow tag' });
    }
});

// Get followed tags
app.get('/followed-tags', authenticateToken, async (req, res) => {
    try {
        const followedTags = await prisma.userFollowedTag.findMany({
            where: { idUser: req.user.idUser },
            include: { tag: true },
        });
        res.json(followedTags.map((ft) => ft.tag));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch followed tags' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
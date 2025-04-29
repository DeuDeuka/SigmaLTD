const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// Middleware to authenticate JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await prisma.users.findUnique({ where: { idUser: decoded.id } });
        if (!req.user) return res.status(401).json({ error: 'Invalid token' });
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// 1. Register
app.post('/register', async (req, res) => {
    const { email, password, realName, group, displayedName } = req.body;

    try {
        const existingUser = await prisma.nsu.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const nsuUser = await prisma.nsu.create({
            data: {
                realName,
                email,
                group,
                hasLogined: false,
                users: {
                    create: {
                        displayedName,
                        password: hashedPassword,
                        pic: ''
                    }
                }
            }
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// 2. Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const nsuUser = await prisma.nsu.findUnique({
            where: { email },
            include: { users: true }
        });

        if (!nsuUser || !nsuUser.users) return res.status(400).json({ error: 'Invalid credentials' });

        const isValid = await bcrypt.compare(password, nsuUser.users.password);
        if (!isValid) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: nsuUser.users.idUser }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// 3. Logout (client-side)
app.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful (discard token client-side)' });
});

// 4. Get current user
app.get('/current-user', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: { idUser: req.user.idUser }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// 5. Update current user
app.post('/current-user', authenticateToken, async (req, res) => {
    const { username, image } = req.body;

    try {
        const updateData = {};
        if (username) updateData.displayedName = username;
        if (image) updateData.pic = image;base64;

        await prisma.users.update({
            where: { idUser: req.user.idUser },
            data: updateData
        });

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// 6. Get posts
app.get('/posts', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const skip = (page - 1) * pageSize;

    try {
        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                orderBy: { idPost: 'desc' },
                take: pageSize,
                skip
            }),
            prisma.post.count()
        ]);

        res.json({ posts, total, page, pageSize });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// 7. Create post
app.post('/posts', authenticateToken, async (req, res) => {
    const { content, tags, isAnonymous, images } = req.body;

    try {
        const post = await prisma.post.create({
            data: {
                content,
                images: images ? JSON.stringify(images) : null,
                tags,
                createdByIdUser: isAnonymous ? null : req.user.idUser
            }
        });
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// 8. Delete post
app.delete('/posts', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    try {
        await prisma.post.delete({
            where: {
                idPost: postId,
                createdByIdUser: req.user.idUser
            }
        });
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// 9. Get single post
app.get('/post/:id', async (req, res) => {
    try {
        const post = await prisma.post.findUnique({
            where: { idPost: parseInt(req.params.id) }
        });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// 10. Get post comments
app.get('/post/:id/comments', async (req, res) => {
    try {
        const comments = await prisma.comment.findMany({
            where: { commentIdPost: parseInt(req.params.id) },
            include: { users: { select: { displayedName: true } } },
            orderBy: { createdAt: 'asc' }
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// 11. Get comments count
app.get('/post/:id/comments-count', async (req, res) => {
    try {
        const count = await prisma.comment.count({
            where: { commentIdPost: parseInt(req.params.id) }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments count' });
    }
});

// 12. Add comment
app.post('/comments', authenticateToken, async (req, res) => {
    const { postId, content, isAnonymous } = req.body;

    try {
        const comment = await prisma.comment.create({
            data: {
                commentIdPost: postId,
                text: content,
                createdByIdUser: isAnonymous ? null : req.user.idUser
            }
        });
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

// 13. Get paginated comments
app.get('/comments', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const skip = (page - 1) * pageSize;

    try {
        const [comments, total] = await Promise.all([
            prisma.comment.findMany({
                orderBy: { idComment: 'desc' },
                take: pageSize,
                skip
            }),
            prisma.comment.count()
        ]);

        res.json({ comments, total, page, pageSize });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// 14. Get user profile and posts
app.get('/user/:id', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const skip = (page - 1) * pageSize;

    try {
        const [user, posts, total] = await Promise.all([
            prisma.users.findUnique({
                where: { idUser: parseInt(req.params.id) },
                select: { displayedName: true, pic: true }
            }),
            prisma.post.findMany({
                where: { createdByIdUser: parseInt(req.params.id) },
                orderBy: { createdAt: 'desc' },
                take: pageSize,
                skip
            }),
            prisma.post.count({ where: { createdByIdUser: parseInt(req.params.id) } })
        ]);

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user, posts, total, page, pageSize });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// 15. Following posts
app.get('/following-posts', authenticateToken, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const skip = (page - 1) * pageSize;

    try {
        console.log(`Fetching followed tags for user ${req.user.idUser}`);
        const followedTags = await prisma.userFollowedTag.findMany({
            where: { idUser: req.user.idUser },
            select: { tag: { select: { name: true } } },
        });
        const tagNames = followedTags.map((ft) => ft.tag.name);
        console.log('Followed tags:', tagNames);

        if (tagNames.length === 0) {
            console.log('No followed tags, returning empty response');
            return res.json({ posts: [], total: 0, page, pageSize });
        }

        const tagConditions = tagNames.map((tag) => ({
            tags: { contains: tag, mode: 'insensitive' },
        }));

        console.log('Executing posts query with conditions:', tagConditions);
        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                where: {
                    AND: [
                        { tags: { not: null } }, // Ensure tags is not null
                        { OR: tagConditions },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                take: pageSize,
                skip,
                distinct: ['idPost'],
                include: {
                    createdBy: { select: { displayedName: true } }, // Optional: Include creator info
                },
            }),
            prisma.post.count({
                where: {
                    AND: [
                        { tags: { not: null } },
                        { OR: tagConditions },
                    ],
                },
            }),
        ]);

        console.log(`Fetched ${posts.length} posts, total: ${total}`);
        res.json({ posts, total, page, pageSize });
    } catch (error) {
        console.error('Error in /following-posts:', error);
        res.status(500).json({ error: 'Failed to fetch following posts', details: error.message });
    }
});

// 16. Like post
app.post('/like-post', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    try {
        await prisma.$transaction([
            prisma.userLikedPost.upsert({
                where: {
                    idUser_idPost: { idUser: req.user.idUser, idPost: postId }
                },
                update: {},
                create: { idUser: req.user.idUser, idPost: postId }
            }),
            prisma.post.update({
                where: { idPost: postId },
                data: { likes: { increment: 1 } }
            })
        ]);

        const post = await prisma.post.findUnique({ where: { idPost: postId } });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// 17. Unlike post
app.post('/unlike-post', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    try {
        await prisma.$transaction([
            prisma.userLikedPost.deleteMany({
                where: { idUser: req.user.idUser, idPost: postId }
            }),
            prisma.post.update({
                where: { idPost: postId },
                data: { likes: { decrement: 1 } }
            })
        ]);

        const post = await prisma.post.findUnique({ where: { idPost: postId } });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlike post' });
    }
});

// 18. Check post like
app.get('/like-post', authenticateToken, async (req, res) => {
    const { idPost } = req.query;

    try {
        const like = await prisma.userLikedPost.findUnique({
            where: {
                idUser_idPost: { idUser: req.user.idUser, idPost: parseInt(idPost) }
            }
        });
        res.json({ liked: !!like });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check like status' });
    }
});

// 19. Like comment
app.post('/like-comment', authenticateToken, async (req, res) => {
    const { commentId } = req.body;

    try {
        await prisma.$transaction([
            prisma.userLikedComment.upsert({
                where: {
                    idUser_idComment: { idUser: req.user.idUser, idComment: commentId }
                },
                update: {},
                create: { idUser: req.user.idUser, idComment: commentId }
            }),
            prisma.comment.update({
                where: { idComment: commentId },
                data: { likes: { increment: 1 } }
            })
        ]);

        const comment = await prisma.comment.findUnique({ where: { idComment: commentId } });
        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to like comment' });
    }
});

// 20. Get comment likes
app.post('/get-comment-likes', async (req, res) => {
    const { commentId } = req.body;

    try {
        const likes = await prisma.userLikedComment.findMany({
            where: { idComment: commentId }
        });
        res.json(likes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comment likes' });
    }
});

// 21. Unlike comment
app.post('/unlike-comment', authenticateToken, async (req, res) => {
    const { commentId } = req.body;

    try {
        await prisma.$transaction([
            prisma.userLikedComment.deleteMany({
                where: { idUser: req.user.idUser, idComment: commentId }
            }),
            prisma.comment.update({
                where: { idComment: commentId },
                data: { likes: { decrement: 1 } }
            })
        ]);

        const comment = await prisma.comment.findUnique({ where: { idComment: commentId } });
        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlike comment' });
    }
});

// 22. Follow tag
app.post('/follow-tag', authenticateToken, async (req, res) => {
    const { tagName } = req.body;

    try {
        const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName }
        });

        await prisma.userFollowedTag.upsert({
            where: {
                idUser_idTag: { idUser: req.user.idUser, idTag: tag.idTag }
            },
            update: {},
            create: { idUser: req.user.idUser, idTag: tag.idTag }
        });

        res.json({ message: 'Tag followed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to follow tag' });
    }
});

// 23. Unfollow tag
app.post('/unfollow-tag', authenticateToken, async (req, res) => {
    const { tagName } = req.body;

    try {
        const tag = await prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) return res.status(404).json({ error: 'Tag not found' });

        await prisma.userFollowedTag.deleteMany({
            where: { idUser: req.user.idUser, idTag: tag.idTag }
        });

        res.json({ message: 'Tag unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unfollow tag' });
    }
});

// 24. Get followed tags
app.get('/followed-tags', authenticateToken, async (req, res) => {
    try {
        const tags = await prisma.userFollowedTag.findMany({
            where: { idUser: req.user.idUser },
            select: { tag: { select: { name: true } } }
        });
        res.json(tags.map(t => t.tag.name));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch followed tags' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
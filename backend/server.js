const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Database connection pool
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'u3079686_sigma',
    password: 'yoursocialsecurityisexpiredpleaseenteritmanually',
    database: 'u3079686_dev',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-please-change-me';

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure Uploads directory exists
(async () => {
    const uploadDir = path.join(__dirname, 'uploads');
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.chmod(uploadDir, 0o777);
    } catch (error) {
        console.error('Failed to create Uploads directory:', error);
    }
})();

// Helper function to respond
const respond = (res, data, status = 200) => {
    res.status(status).json(data);
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
        return respond(res, { error: 'Access denied, no valid Bearer token provided' }, 401);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await dbPool.execute('SELECT * FROM Users WHERE idUser = ?', [decoded.userId]);
        const user = rows[0];

        if (!user) {
            return respond(res, { error: 'Invalid token: user not found' }, 401);
        }

        req.user = user;
        next();
    } catch (error) {
        return respond(res, { error: 'Invalid or expired token' }, 403);
    }
};

app.get('/', async (req, res) => {
    respond(res, {data: "hello world!"});
})

// User Registration
app.post('/register', async (req, res) => {
    const { email, password, realName, group, displayedName } = req.body;

    // Validate input
    if (!email || !password || !realName || !group || !displayedName) {
        return respond(res, { error: 'All fields are required' }, 400);
    }
    if (group.length > 10) {
        return respond(res, { error: 'Group name must be 10 characters or fewer' }, 400);
    }

    try {
        // Check if email exists
        const [existing] = await dbPool.execute('SELECT * FROM Nsu WHERE email = ?', [email]);
        if (existing.length > 0) {
            return respond(res, { error: 'Email already exists' }, 400);
        }

        // Insert into Nsu
        const [nsuResult] = await dbPool.execute(
            'INSERT INTO Nsu (realName, email, `group`, hasLogined) VALUES (?, ?, ?, ?)',
            [realName, email, group, false]
        );
        const userId = nsuResult.insertId;

        // Insert into Users
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbPool.execute(
            'INSERT INTO Users (idUser, displayedName, pic, password) VALUES (?, ?, ?, ?)',
            [userId, displayedName, 'https://via.placeholder.com/150', hashedPassword]
        );

        const token = jwt.sign({ userId }, JWT_SECRET);
        respond(res, { token, user: { idUser, displayedName } });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// User Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await dbPool.execute(
            'SELECT n.*, u.* FROM Nsu n JOIN Users u ON n.idNsuUser = u.idUser WHERE n.email = ?',
            [email]
        );
        const nsu = rows[0];

        if (!nsu || !(await bcrypt.compare(password, nsu.password))) {
            return respond(res, { error: 'Invalid email or password' }, 401);
        }

        const token = jwt.sign({ userId: nsu.idNsuUser }, JWT_SECRET);
        respond(res, { token, user: nsu });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Logout (Client-side)
app.post('/logout', (req, res) => {
    respond(res, { success: true, message: 'Logout successful, discard token on client' });
});

// Current User
app.get('/current-user', authenticateToken, (req, res) => {
    respond(res, { idUser: req.user.idUser, displayedName: req.user.displayedName });
});

// Posts Endpoint
// Get Posts with Pagination
app.get('/posts', authenticateToken, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize) || 10), 100);
    const offset = (page - 1) * pageSize;

    try {
        const [posts] = await dbPool.execute(
            'SELECT * FROM Post ORDER BY idPost DESC LIMIT ? OFFSET ?',
            [pageSize, offset]
        );
        const [[{ totalPosts }]] = await dbPool.execute('SELECT COUNT(*) as totalPosts FROM Post');
        const totalPages = Math.ceil(totalPosts / pageSize);

        respond(res, {
            posts,
            pagination: { currentPage: page, pageSize, totalPosts, totalPages },
        });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Delete Post
app.delete('/posts', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    if (!postId || postId <= 0) {
        return respond(res, { error: 'Invalid post ID' }, 400);
    }

    try {
        const [result] = await dbPool.execute(
            'DELETE FROM Post WHERE createdByIdUser = ? AND idPost = ?',
            [req.user.idUser, postId]
        );

        if (result.affectedRows > 0) {
            respond(res, { success: true, message: 'Post deleted successfully' });
        } else {
            respond(res, { error: 'Post not found or not authorized to delete' }, 404);
        }
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Create Post
app.post('/posts', authenticateToken, async (req, res) => {
    const { content, tags, isAnonymous, images } = req.body;

    if (!content && (!images || images.length === 0)) {
        return respond(res, { error: 'Content or media is required' }, 400);
    }

    try {
        const uploadDir = path.join(__dirname, 'uploads');
        const imagePaths = [];

        if (images && Array.isArray(images)) {
            for (const image of images) {
                const { base64, name } = image;
                if (!base64 || !name) continue;

                const binaryData = Buffer.from(base64, 'base64');
                const destination = path.join(uploadDir, name);
                await fs.writeFile(destination, binaryData);
                imagePaths.push(`/uploads/${name}`);
            }
        }

        const tagsString = tags ? tags.split(',').map(tag => tag.trim()).join(',') : null;
        const imageString = imagePaths.join(',');
        const userId = isAnonymous ? 2 : req.user.idUser;

        const [result] = await dbPool.execute(
            'INSERT INTO Post (content, images, tags, createdByIdUser) VALUES (?, ?, ?, ?)',
            [content, imageString, tagsString, userId]
        );
        const postId = result.insertId;

        const post = {
            idPost: postId,
            content,
            images: imagePaths,
            tags: tagsString ? tagsString.split(',') : [],
            createdByIdUser: userId,
            isAnonymous,
            comments: [],
        };

        respond(res, post, 201);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Get Single Post
app.get('/post/:id', authenticateToken, async (req, res) => {
    const postId = parseInt(req.params.id);

    try {
        const [rows] = await dbPool.execute('SELECT * FROM Post WHERE idPost = ?', [postId]);
        const post = rows[0];

        if (!post) {
            return respond(res, { error: 'Post not found' }, 404);
        }

        post.tags = post.tags ? post.tags.split(',') : [];
        post.images = post.images ? post.images.split(',') : [];
        respond(res, post);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Get Post Comments
app.get('/post/:id/comments', authenticateToken, async (req, res) => {
    const postId = parseInt(req.params.id);

    try {
        const [comments] = await dbPool.execute(
            'SELECT c.*, u.displayedName FROM Comment c JOIN Users u ON c.createdByIdUser = u.idUser WHERE c.commentIdPost = ? ORDER BY c.createdAt ASC',
            [postId]
        );
        respond(res, comments);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Get Post Comments Count
app.get('/post/:id/comments-count', authenticateToken, async (req, res) => {
    const postId = parseInt(req.params.id);

    try {
        const [rows] = await dbPool.execute(
            'SELECT COUNT(*) as count FROM Comment WHERE commentIdPost = ?',
            [postId]
        );
        respond(res, { count: rows[0].count });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Add Comment
app.post('/comments', authenticateToken, async (req, res) => {
    const { postId, content, isAnonymous } = req.body;
    const userId = isAnonymous ? 2 : req.user.idUser;

    try {
        const [result] = await dbPool.execute(
            'INSERT INTO Comment (commentIdPost, text, createdByIdUser) VALUES (?, ?, ?)',
            [postId, content, userId]
        );
        const commentId = result.insertId;

        const comment = { idComment: commentId, commentIdPost: postId, text: content, createdByIdUser: userId };
        respond(res, comment);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Get Comments with Pagination
app.get('/comments', authenticateToken, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize) || 10), 100);
    const offset = (page - 1) * pageSize;

    try {
        const [comments] = await dbPool.execute(
            'SELECT * FROM Comment ORDER BY idComment DESC LIMIT ? OFFSET ?',
            [pageSize, offset]
        );
        const [[{ totalPosts }]] = await dbPool.execute('SELECT COUNT(*) as totalPosts FROM Comment');
        const totalPages = Math.ceil(totalPosts / pageSize);

        respond(res, {
            comments,
            pagination: { currentPage: page, pageSize, totalPosts, totalPages },
        });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Update Username and Profile Picture
app.post('/current-user', authenticateToken, async (req, res) => {
    const { username, image } = req.body;

    try {
        if (username) {
            await dbPool.execute('UPDATE Users SET displayedName = ? WHERE idUser = ?', [username, req.user.idUser]);
        }

        let imagePath = '';
        if (image && image.base64 && image.name) {
            const uploadDir = path.join(__dirname, 'uploads');
            const binaryData = Buffer.from(image.base64, 'base64');
            const destination = path.join(uploadDir, image.name);
            await fs.writeFile(destination, binaryData);
            imagePath = `http://localhost:3000/Uploads/${image.name}`;

            await dbPool.execute('UPDATE Users SET pic = ? WHERE idUser = ?', [imagePath, req.user.idUser]);
        }

        respond(res, { displayedName: username, image: imagePath });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Get User Profile
app.get('/user/:id', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize) || 10), 100);
    const offset = (page - 1) * pageSize;

    try {
        const [profileRows] = await dbPool.execute(
            'SELECT displayedName, pic FROM Users WHERE idUser = ?',
            [userId]
        );
        const profile = profileRows[0];

        if (!profile) {
            return respond(res, { error: 'User not found' }, 404);
        }

        const [posts] = await dbPool.execute(
            'SELECT * FROM Post WHERE createdByIdUser = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [req.user.idUser, pageSize, offset]
        );
        const [[{ totalPosts }]] = await dbPool.execute(
            'SELECT COUNT(*) as totalPosts FROM Post WHERE createdByIdUser = ?',
            [req.user.idUser]
        );
        const totalPages = Math.ceil(totalPosts / pageSize);

        respond(res, {
            user: profile,
            posts,
            pagination: { currentPage: page, pageSize, totalPosts, totalPages },
        });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Following Posts
app.get('/following-posts', authenticateToken, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize) || 10), 100);
    const offset = (page - 1) * pageSize;

    try {
        const [posts] = await dbPool.execute(
            `SELECT DISTINCT p.*
       FROM Post p
       WHERE EXISTS (
         SELECT 1
         FROM UserFollowedTag uft
         JOIN Tag t ON uft.idTag = t.idTag
         WHERE uft.idUser = ?
         AND (
           p.tags = t.name
           OR p.tags LIKE CONCAT(t.name, ',%')
           OR p.tags LIKE CONCAT('%,', t.name)
           OR p.tags LIKE CONCAT('%,', t.name, ',%')
           OR (p.tags IS NULL AND t.name = '')
         )
       )
       ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`,
            [req.user.idUser, pageSize, offset]
        );

        const [[{ totalPosts }]] = await dbPool.execute(
            `SELECT COUNT(DISTINCT p.idPost) as totalPosts
       FROM Post p
       WHERE EXISTS (
         SELECT 1
         FROM UserFollowedTag uft
         JOIN Tag t ON uft.idTag = t.idTag
         WHERE uft.idUser = ?
         AND (
           p.tags = t.name
           OR p.tags LIKE CONCAT(t.name, ',%')
           OR p.tags LIKE CONCAT('%,', t.name)
           OR p.tags LIKE CONCAT('%,', t.name, ',%')
           OR (p.tags IS NULL AND t.name = '')
         )
       )`,
            [req.user.idUser]
        );
        const totalPages = Math.ceil(totalPosts / pageSize);

        respond(res, {
            posts,
            pagination: { currentPage: page, pageSize, totalPosts, totalPages },
        });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Likes
app.post('/like-post', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    try {
        await dbPool.execute(
            'INSERT INTO UserLikedPost (idUser, idPost) VALUES (?, ?) ON DUPLICATE KEY UPDATE idUser = idUser',
            [req.user.idUser, postId]
        );
        await dbPool.execute('UPDATE Post SET likes = likes + 1 WHERE idPost = ?', [postId]);
        const [rows] = await dbPool.execute('SELECT * FROM Post WHERE idPost = ?', [postId]);
        respond(res, rows[0]);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

app.post('/unlike-post', authenticateToken, async (req, res) => {
    const { postId } = req.body;

    try {
        await dbPool.execute('DELETE FROM UserLikedPost WHERE idUser = ? AND idPost = ?', [req.user.idUser, postId]);
        await dbPool.execute('UPDATE Post SET likes = likes - 1 WHERE idPost = ?', [postId]);
        const [rows] = await dbPool.execute('SELECT * FROM Post WHERE idPost = ?', [postId]);
        respond(res, rows[0]);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

app.get('/like-post', authenticateToken, async (req, res) => {
    const postId = parseInt(req.query.idPost) || 0;

    try {
        const [rows] = await dbPool.execute(
            'SELECT * FROM UserLikedPost WHERE idUser = ? AND idPost = ?',
            [req.user.idUser, postId]
        );
        respond(res, rows[0] || {});
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

app.post('/like-comment', authenticateToken, async (req, res) => {
    const { commentId } = req.body;

    try {
        await dbPool.execute(
            'INSERT INTO UserLikedComment (idUser, idComment) VALUES (?, ?) ON DUPLICATE KEY UPDATE idUser = idUser',
            [req.user.idUser, commentId]
        );
        await dbPool.execute('UPDATE Comment SET likes = likes + 1 WHERE idComment = ?', [commentId]);
        const [rows] = await dbPool.execute('SELECT * FROM Comment WHERE idComment = ?', [commentId]);
        respond(res, rows[0]);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

app.post('/get-comment-likes', authenticateToken, async (req, res) => {
    const { commentId } = req.body;

    try {
        const [rows] = await dbPool.execute('SELECT * FROM UserLikedComment WHERE idComment = ?', [commentId]);
        respond(res, rows);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

app.post('/unlike-comment', authenticateToken, async (req, res) => {
    const { commentId } = req.body;

    try {
        await dbPool.execute('DELETE FROM UserLikedComment WHERE idUser = ? AND idComment = ?', [req.user.idUser, commentId]);
        await dbPool.execute('UPDATE Comment SET likes = likes - 1 WHERE idComment = ?', [commentId]);
        const [rows] = await dbPool.execute('SELECT * FROM Comment WHERE idComment = ?', [commentId]);
        respond(res, rows[0]);
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// Tags
app.post('/follow-tag', authenticateToken, async (req, res) => {
    const { tagName } = req.body;

    try {
        await dbPool.execute(
            'INSERT INTO Tag (name) VALUES (?) ON DUPLICATE KEY UPDATE idTag = idTag',
            [tagName]
        );
        const [rows] = await dbPool.execute('SELECT idTag FROM Tag WHERE name = ?', [tagName]);
        const tagId = rows[0].idTag;

        await dbPool.execute(
            'INSERT INTO UserFollowedTag (idUser, idTag) VALUES (?, ?) ON DUPLICATE KEY UPDATE idUser = idUser',
            [req.user.idUser, tagId]
        );
        respond(res, { success: true });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

app.post('/unfollow-tag', authenticateToken, async (req, res) => {
    const { tagName } = req.body;

    try {
        const [rows] = await dbPool.execute('SELECT idTag FROM Tag WHERE name = ?', [tagName]);
        if (rows.length > 0) {
            await dbPool.execute(
                'DELETE FROM UserFollowedTag WHERE idUser = ? AND idTag = ?',
                [req.user.idUser, rows[0].idTag]
            );
        }
        respond(res, { success: true });
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

app.get('/followed-tags', authenticateToken, async (req, res) => {
    try {
        const [rows] = await dbPool.execute(
            'SELECT t.name FROM UserFollowedTag uft JOIN Tag t ON uft.idTag = t.idTag WHERE uft.idUser = ?',
            [req.user.idUser]
        );
        respond(res, rows.map(row => row.name));
    } catch (error) {
        respond(res, { error: 'Database error: ' + error.message }, 500);
    }
});

// 404 Handler
app.use((req, res) => {
    respond(res, { error: 'Not Found' }, 404);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);

// Use memory store for files in this demo for simplicity, or we can use GridFS/Multer for real files.
const multer = require('multer');
const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codealpha-meeting-app')
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.log(err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/meeting', require('./routes/meeting'));

// In-memory store for shared files
const sharedFiles = {}; // roomId -> [files]

app.post('/api/meeting/upload/:roomId', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const roomId = req.params.roomId;
    const file = {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer.toString('base64'),
        id: Date.now().toString()
    };

    if (!sharedFiles[roomId]) {
        sharedFiles[roomId] = [];
    }
    sharedFiles[roomId].push(file);

    res.json({
        id: file.id,
        originalName: file.originalName,
        mimetype: file.mimetype,
        size: file.size
    });
});

app.get('/api/meeting/files/:roomId', (req, res) => {
    const files = sharedFiles[req.params.roomId] || [];
    const filesMetadata = files.map(f => ({
        id: f.id,
        originalName: f.originalName,
        mimetype: f.mimetype,
        size: f.size
    }));
    res.json(filesMetadata);
});

app.get('/api/meeting/download/:roomId/:fileId', (req, res) => {
    const files = sharedFiles[req.params.roomId] || [];
    const file = files.find(f => f.id === req.params.fileId);
    if (!file) return res.status(404).json({ msg: 'File not found' });

    const buffer = Buffer.from(file.buffer, 'base64');
    res.setHeader('Content-disposition', 'attachment; filename=' + file.originalName);
    res.setHeader('Content-type', file.mimetype);
    res.send(buffer);
});


// Socket.io Setup
const io = socketio(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    // Join Room
    socket.on('join-room', ({ roomId, user }) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', { userId: socket.id, user });

        // Chat Message
        socket.on('send-message', (message) => {
            io.to(roomId).emit('receive-message', {
                ...message,
                userId: socket.id,
                timestamp: new Date()
            });
        });

        // Whiteboard drawing
        socket.on('draw', (data) => {
            socket.to(roomId).emit('draw-collaborate', data);
        });

        // File shared notification
        socket.on('file-shared', (fileMetadata) => {
            socket.to(roomId).emit('file-shared-notify', fileMetadata);
        });

        // WebRTC Signaling
        socket.on('offer', (data) => {
            socket.to(data.target).emit('offer', {
                caller: socket.id,
                sdp: data.sdp,
                user: data.user
            });
        });

        socket.on('answer', (data) => {
            socket.to(data.target).emit('answer', {
                caller: socket.id,
                sdp: data.sdp
            });
        });

        socket.on('ice-candidate', (data) => {
            socket.to(data.target).emit('ice-candidate', {
                caller: socket.id,
                candidate: data.candidate
            });
        });

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', socket.id);
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

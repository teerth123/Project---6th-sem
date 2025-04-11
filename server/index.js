// --- index.js ---
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import uploadRoutes from './routes/uploadRoutes.js';
import videoTrackingRoutes from './routes/videoTrackingRoutes.js';
import initializeSocket from './socket.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "deqnf0a9w",
  api_key: process.env.CLOUD_API_KEY ||  "898792876773274",
  api_secret: process.env.CLOUD_API_SECRET || "EIDrDnm5yaXfVO7SougS77OJmi4",
});

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + fileExtension);
  },
});

const upload = multer({ storage: storage });
// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io accessible to route handlers
app.set('io', io);

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/video-tracking', videoTrackingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
app.get('/', (req, res) => {
  res.json({
    msg: "hi"
  });
})

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

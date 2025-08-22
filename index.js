import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import passport from 'passport';
import jwt from 'jsonwebtoken';

// Import Models for Socket.IO
import User from './models/User.js';
import Message from './models/Message.js';
import Conversation from './models/Conversation.js';
// Import Passport config
import configurePassport from './config/passport.js';

// Import all route files
import conversationRoutes from './routes/conversationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
// --- Initialization ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production later
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Run Passport configuration
configurePassport(passport);

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected successfully!");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// Express session middleware
app.use(session({
  secret: 'a very secret key', // Change this to a random string from your .env file
  resave: false,
  saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// --- API Routes ---
app.get('/', (req, res) => res.json({ message: "Welcome to the Sahayata API!" }));
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/auth', authRoutes); // This is the route for Google login
app.use('/api/conversations', conversationRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/upload', uploadRoutes); 
app.use('/api/reviews', reviewRoutes);

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', ({ postId }) => {
    socket.join(postId);
    console.log(`User ${socket.id} joined room ${postId}`);
  });

  socket.on('sendMessage', async ({ postId, senderId, text }) => {
    try {
      const message = new Message({ post: postId, sender: senderId, text });
      await message.save();
      
      const sender = await User.findById(senderId).select('name');
      const messageToSend = {
        ...message.toObject(),
        sender: { _id: sender._id, name: sender.name }
      };

      io.to(postId).emit('receiveMessage', messageToSend);
    } catch (error) {
      console.error('Socket.IO sendMessage error:', error);
    }
  });
   socket.on('joinConversation', ({ conversationId }) => {
    socket.join(conversationId);
    console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });
   socket.on('sendPrivateMessage', async ({ conversationId, senderId, text }) => {
    try {
      const message = new Message({ conversation: conversationId, sender: senderId, text });
      await message.save();

      const sender = await User.findById(senderId).select('name');
      const messageToSend = {
        ...message.toObject(),
        sender: { _id: sender._id, name: sender.name }
      };

      // Broadcast message to the specific conversation room
      io.to(conversationId).emit('receivePrivateMessage', messageToSend);
    } catch (error) {
      console.error('Socket.IO sendPrivateMessage error:', error);
    }
  });


  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- Start Server ---
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startServer();
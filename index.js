// server.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import passport from 'passport';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';

import xssInPlace from './middleware/xssInPlace.js';
import safeSanitize from './middleware/safeSanitize.js';
import cookieParser from 'cookie-parser';

// Models used by sockets
import User from './models/User.js';
import Message from './models/Message.js';

// Passport config
import configurePassport from './config/passport.js';

// Routes
import conversationRoutes from './routes/conversationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

// Error middleware
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();
const server = http.createServer(app);

// ---------- Socket.IO ----------
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => cb(null, true), // transport CORS is not strict; HTTP CORS below is
    methods: ['GET', 'POST'],
  },
});
app.set('io', io); // <-- make io available inside controllers via req.app.get('io')

// ---------- Config ----------
const PORT = process.env.PORT || 5000;
configurePassport(passport);

// ---------- DB ----------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (e) {
    console.error('❌ MongoDB connection failed:', e.message);
    process.exit(1);
  }
};

// ---------- Middleware (order matters) ----------
app.use(helmet());

/** CORS for HTTP routes (strict, but dev-friendly) */
const envOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Default dev origins
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowList = Array.from(new Set([...devOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, cb) => {
      // allow tools / curl (no origin) and allow-listed origins
      if (!origin || allowList.length === 0 || allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed: ${origin}`), false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(safeSanitize);
app.use(cookieParser());
app.use(xssInPlace);
app.use(compression());
app.use(morgan('tiny'));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Rate-limit auth endpoints a bit
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// ---------- Routes ----------
app.get('/', (req, res) => res.json({ message: 'Welcome to the Sahayata API!' }));
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/groups', groupRoutes);

// Errors
app.use(notFound);
app.use(errorHandler);

// ---------- Socket.IO events ----------
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Post/project room chat (existing)
  socket.on('joinRoom', ({ postId }) => {
    if (postId) socket.join(postId);
  });
  socket.on('sendMessage', async ({ postId, senderId, text }) => {
    try {
      if (!postId || !senderId || !text?.trim()) return;
      const message = await new Message({ post: postId, sender: senderId, text }).save();
      const sender = await User.findById(senderId).select('name avatar');
      io.to(postId).emit('receiveMessage', {
        ...message.toObject(),
        sender: { _id: sender._id, name: sender.name, avatar: sender.avatar },
      });
    } catch (e) {
      console.error('sendMessage error', e);
    }
  });

  // Private conversation chat (existing)
  socket.on('joinConversation', ({ conversationId }) => {
    if (conversationId) socket.join(conversationId);
  });
  socket.on('sendPrivateMessage', async ({ conversationId, senderId, text }) => {
    try {
      if (!conversationId || !senderId || !text?.trim()) return;
      const message = await new Message({ conversation: conversationId, sender: senderId, text }).save();
      const sender = await User.findById(senderId).select('name avatar');
      io.to(conversationId).emit('receivePrivateMessage', {
        ...message.toObject(),
        sender: { _id: sender._id, name: sender.name, avatar: sender.avatar },
      });
    } catch (e) {
      console.error('sendPrivateMessage error', e);
    }
  });

  // NEW: Group chat rooms (used by GroupPage)
  socket.on('group:join', (groupId) => {
    if (!groupId) return;
    socket.join(`group:${groupId}`);
  });

  socket.on('group:leave', (groupId) => {
    if (!groupId) return;
    socket.leave(`group:${groupId}`);
  });

  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// ---------- Start ----------
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
};
startServer();

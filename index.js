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
import path from 'path';

// Models used by sockets
import User from './models/User.js';
import Message from './models/Message.js';
// ✨ NEW: for group socket send (optional)
import GroupMessage from './models/GroupMessage.js';
import Group from './models/Group.js';

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
import ensureTopicGroups from './utils/seedGroups.js';

// Error middleware
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();
const server = http.createServer(app);

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

// ---------- CORS Setup ----------
const envOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Default dev + prod origins
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const prodOrigins = ['https://sahayata-frontend.vercel.app']; // ✅ Vercel frontend

const allowList = Array.from(new Set([...devOrigins, ...prodOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed: ${origin}`), false);
    },
    credentials: true,
  })
);

// ---------- Middleware ----------
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(safeSanitize);
app.use(cookieParser());
app.use(xssInPlace);
app.use(compression());
app.use(morgan('tiny'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Rate-limit auth endpoints
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

// ---------- Socket.IO ----------
const io = new Server(server, {
  cors: {
    origin: allowList,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // ----- Post/project chat -----
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

  // ----- Private chat -----
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

  // ----- Group chat -----
  socket.on('group:join', (groupId) => {
    if (groupId) socket.join(`group:${groupId}`);
  });

  socket.on('group:leave', (groupId) => {
    if (groupId) socket.leave(`group:${groupId}`);
  });

  // ✨ NEW: typing relay (used by GroupPage UI)
  socket.on('group:typing', ({ groupId, userId, name }) => {
    if (!groupId) return;
    socket.to(`group:${groupId}`).emit('group:typing', { userId, name });
  });

  /* OPTIONAL: socket-based sending (UI can stay on HTTP; keep this if you might switch later) */
  socket.on('group:send', async ({ groupId, senderId, text, clientId }, ack) => {
    try {
      if (!groupId || !senderId || !text?.trim()) return ack?.({ ok: false });
      const msg = await GroupMessage.create({
        group: groupId,
        sender: senderId,
        text: text.trim(),
        clientId: clientId || undefined,
      });
      await Group.findByIdAndUpdate(groupId, { $set: { lastMessageAt: new Date() } });
      const populated = await msg.populate([{ path: 'sender', select: 'name avatar' }]);
      io.to(`group:${groupId}`).emit('group:message', populated);
      ack?.({ ok: true, message: populated });
    } catch (e) {
      console.error('group:send error', e);
      ack?.({ ok: false });
    }
  });

  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// ---------- Start ----------
const startServer = async () => {
  await connectDB();
  await ensureTopicGroups(); // ✅ seeds when groups collection is empty
  server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
};

startServer();

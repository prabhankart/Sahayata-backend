import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import session from "express-session";
import passport from "passport";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";

import xssInPlace from "./middleware/xssInPlace.js";
import safeSanitize from "./middleware/safeSanitize.js";
import cookieParser from "cookie-parser";
import path from "path";

// Models used by sockets
import User from "./models/User.js";
import Message from "./models/Message.js";
import GroupMessage from "./models/GroupMessage.js";
import Group from "./models/Group.js";

// Passport config
import configurePassport from "./config/passport.js";

// Routes
import conversationRoutes from "./routes/conversationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import ensureTopicGroups from "./utils/seedGroups.js";

// Error middleware
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const app = express();
const server = http.createServer(app);

// ---------- Config ----------
const PORT = process.env.PORT || 5000;
configurePassport(passport);

// ---------- DB ----------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (e) {
    console.error("❌ MongoDB connection failed:", e.message);
    process.exit(1);
  }
};

// ---------- CORS Setup ----------
const envOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const devOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const prodOrigins = ["https://sahayata-frontend.vercel.app"];
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
app.use(express.json({ limit: "1mb" }));
app.use(safeSanitize);
app.use(cookieParser());
app.use(xssInPlace);
app.use(compression());
app.use(morgan("tiny"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Rate-limit auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);

// ---------- Routes ----------
app.get("/", (req, res) => res.json({ message: "Welcome to the Sahayata API!" }));
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/groups", groupRoutes);

// Errors
app.use(notFound);
app.use(errorHandler);

// ---------- Socket.IO ----------
const io = new Server(server, {
  cors: {
    origin: allowList,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  },
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  /* ------------------------------ Post chat ------------------------------ */
  socket.on("joinRoom", ({ postId }) => {
    if (postId) socket.join(String(postId));
  });
  socket.on("leaveRoom", ({ postId }) => {
    if (postId) socket.leave(String(postId));
  });

  // SINGLE handler (fixes duplicate messages)
  socket.on("sendMessage", async ({ postId, senderId, text, attachments = [], clientId }) => {
    try {
      if (!postId || !senderId) return;
      if (!text?.trim() && attachments.length === 0) return;

      const message = await Message.create({
        post: postId,
        sender: senderId,
        text: text?.trim() || "",
        attachments,
        clientId,
      });

      const sender = await User.findById(senderId).select("name avatar");
      io.to(String(postId)).emit("receiveMessage", {
        ...message.toObject(),
        sender: { _id: sender._id, name: sender.name, avatar: sender.avatar },
      });
    } catch (e) {
      console.error("sendMessage error", e);
    }
  });

  /* --------------------------- Private chat DM --------------------------- */
  socket.on("joinConversation", ({ conversationId }) => {
    if (conversationId) socket.join(String(conversationId));
  });

  socket.on("sendPrivateMessage", async ({ conversationId, senderId, text, attachments = [], clientId }) => {
    try {
      if (!conversationId || !senderId) return;
      if (!text?.trim() && attachments.length === 0) return;

      const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        text: text?.trim() || "",
        attachments,
        clientId,
      });

      const sender = await User.findById(senderId).select("name avatar");
      io.to(String(conversationId)).emit("receivePrivateMessage", {
        ...message.toObject(),
        sender: { _id: sender._id, name: sender.name, avatar: sender.avatar },
      });
    } catch (e) {
      console.error("sendPrivateMessage error", e);
    }
  });
// server.js (inside io.on("connection", (socket) => { ... }))

socket.on("conversation:markRead", async ({ conversationId, userId }) => {
  try {
    if (!conversationId || !userId) return;
    await Message.updateMany(
      {
        conversation: new mongoose.Types.ObjectId(conversationId),
        sender: { $ne: new mongoose.Types.ObjectId(userId) },
        readBy: { $nin: [new mongoose.Types.ObjectId(userId)] },
        deletedForEveryone: { $ne: true },
        deletedFor: { $nin: [new mongoose.Types.ObjectId(userId)] },
      },
      { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
    );

    io.to(String(conversationId)).emit("messagesRead", {
      conversationId: String(conversationId),
      readerId: String(userId),
    });
  } catch (e) {
    console.error("conversation:markRead error", e);
  }
});

  /* ------------------------------ Group chat ----------------------------- */
  socket.on("group:join", (groupId) => {
    if (groupId) socket.join(`group:${groupId}`);
  });
  socket.on("group:leave", (groupId) => {
    if (groupId) socket.leave(`group:${groupId}`);
  });
  socket.on("group:typing", ({ groupId, userId, name }) => {
    if (!groupId) return;
    socket.to(`group:${groupId}`).emit("group:typing", { userId, name });
  });

  // Optional direct socket send for groups (UI can use HTTP)
  socket.on("group:send", async ({ groupId, senderId, text = "", attachments = [], clientId }, ack) => {
    try {
      if (!groupId || !senderId) return ack?.({ ok: false });
      if (!text.trim() && attachments.length === 0) return ack?.({ ok: false });

      const msg = await GroupMessage.create({
        group: groupId,
        sender: senderId,
        text: text.trim(),
        attachments,
        clientId: clientId || undefined,
      });

      await Group.findByIdAndUpdate(groupId, { $set: { lastMessageAt: new Date() } });

      const populated = await msg.populate([{ path: "sender", select: "name avatar" }]);
      const payload = {
        ...populated.toObject(),
        sender: { _id: populated.sender._id, name: populated.sender.name },
      };

      io.to(`group:${groupId}`).emit("group:message", payload);
      ack?.({ ok: true, message: payload });
    } catch (e) {
      console.error("group:send error", e);
      ack?.({ ok: false });
    }
  });

  /* --------------------------- Edit/Delete/React ------------------------- */
  socket.on("deleteMessage", async ({ messageId, mode, userId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      if (mode === "me") {
        if (!msg.deletedFor.includes(userId)) {
          msg.deletedFor.push(userId);
          await msg.save();
        }
        socket.emit("messageDeleted", { messageId, mode });
      } else if (mode === "all") {
        if (msg.sender.toString() !== userId.toString()) return;
        msg.deletedForEveryone = true;
        msg.text = "";
        msg.attachments = [];
        await msg.save();

        const room = msg.conversation ? msg.conversation.toString() : msg.post?.toString();
        if (room) io.to(room).emit("messageDeleted", { messageId, mode });
      }
    } catch (e) {
      console.error("deleteMessage error", e);
    }
  });

  socket.on("editMessage", async ({ messageId, text }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      msg.text = String(text || "").trim();
      msg.edited = true;
      await msg.save();

      const room = msg.conversation ? msg.conversation.toString() : msg.post?.toString();
      if (room) io.to(room).emit("messageEdited", { messageId: msg._id.toString(), text: msg.text });
    } catch (e) {
      console.error("editMessage error", e);
    }
  });

  socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
});

// ---------- Start ----------
const startServer = async () => {
  await connectDB();
  await ensureTopicGroups();
  server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
};

startServer();

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getMessagesForPost,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
  toggleReaction,
  clearPostForMe,
  clearPostForEveryone,
} from "../controllers/messageController.js";

const router = express.Router();

// Project/Post chat (room-level)
router.get("/post/:postId", protect, getMessagesForPost);
router.delete("/post/:postId/me", protect, clearPostForMe);
router.delete("/post/:postId/all", protect, clearPostForEveryone);

// Single message actions
router.patch("/:messageId", protect, editMessage);
router.patch("/:messageId/reactions", protect, toggleReaction);
router.delete("/:messageId/me", protect, deleteMessageForMe);
router.delete("/:messageId/all", protect, deleteMessageForEveryone);

export default router;

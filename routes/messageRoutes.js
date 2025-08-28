import express from 'express';
import { getMessagesForPost } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/:postId', protect, getMessagesForPost);

export default router;

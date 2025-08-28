import express from 'express';
import { getConversations, getConversationMessages, startOrGetConversation } from '../controllers/conversationController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/', protect, getConversations);
router.get('/:conversationId/messages', protect, getConversationMessages);
router.post('/start/:recipientId', protect, startOrGetConversation);

export default router;

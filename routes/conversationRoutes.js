import express from 'express';
import { getConversations, getConversationMessages, startOrGetConversation } from '../controllers/conversationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getConversations);
router.route('/:conversationId/messages').get(protect, getConversationMessages);
router.route('/start/:recipientId').post(protect, startOrGetConversation);

export default router;
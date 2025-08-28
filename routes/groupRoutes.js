// routes/groupRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createGroup, listGroups, getGroup, joinGroup, leaveGroup,
  listGroupMessages, createGroupMessage
} from '../controllers/groupController.js';

const router = express.Router();

router.get('/', protect, listGroups);
router.post('/', protect, createGroup);
router.get('/:groupId', protect, getGroup);
router.post('/:groupId/join', protect, joinGroup);
router.post('/:groupId/leave', protect, leaveGroup);

// chat
router.get('/:groupId/messages', protect, listGroupMessages);
router.post('/:groupId/messages', protect, createGroupMessage);

export default router;

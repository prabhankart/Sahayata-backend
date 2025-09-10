import express from 'express';
import { 
  sendFriendRequest, 
  getPendingRequests, 
  respondToRequest, 
  getFriendships,
  getSentRequests                // ✅ ADD THIS
} from '../controllers/friendController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', protect, getFriendships);
router.get('/requests', protect, getPendingRequests);
router.put('/requests/:requestId', protect, respondToRequest);
router.post('/request/:recipientId', protect, sendFriendRequest);
router.get('/sent', protect, getSentRequests);
router.post('/requests/:requestId/accept', protect, (req, res) => {
  req.body.action = 'accept';
  respondToRequest(req, res);
});

router.post('/requests/:requestId/decline', protect, (req, res) => {
  req.body.action = 'decline';
  respondToRequest(req, res);
});

export default router;

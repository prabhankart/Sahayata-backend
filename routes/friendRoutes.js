import express from 'express';
// Make sure 'getFriendships' is included in this import list
import { 
    sendFriendRequest, 
    getPendingRequests, 
    respondToRequest, 
    getFriendships 
} from '../controllers/friendController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// This is the route that was causing the error
router.route('/').get(protect, getFriendships);

router.route('/requests').get(protect, getPendingRequests);
router.route('/requests/:requestId').put(protect, respondToRequest);
router.route('/request/:recipientId').post(protect, sendFriendRequest);

export default router;
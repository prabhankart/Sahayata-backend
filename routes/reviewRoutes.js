import express from 'express';
import { getReviewsForUser, createReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/', protect, createReview);
router.get('/user/:userId', getReviewsForUser);

export default router;

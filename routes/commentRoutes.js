// routes/commentRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getCommentsForPost, createComment } from '../controllers/commentController.js';

const router = express.Router();

router.get('/post/:postId', getCommentsForPost);
router.post('/', protect, createComment);

export default router;

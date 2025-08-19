import express from 'express';
import { createPost, getPosts, pledgeToPost, getPostById, voteOnPost,updatePost, deletePost  } from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// /api/posts
router.route('/').get(getPosts).post(protect, createPost);
router.route('/:id').get(getPostById);
router.route('/:id/vote').put(protect, voteOnPost);
router.route('/:id/pledge').put(protect, pledgeToPost);
router.route('/:id').get(getPostById).delete(protect, deletePost);
router.route('/:id')
  .get(getPostById)
  .put(protect, updatePost)
  .delete(protect, deletePost);

export default router;
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  voteOnPost,
  pledgeToPost,
  updatePostStatus,
  addView,
} from '../controllers/postController.js';
import multer from 'multer';

const router = express.Router();

// Use memory storage for now (can switch to Cloudinary/S3 later)
const upload = multer({ storage: multer.memoryStorage() });

router.route('/')
  .get(getPosts)
  .post(protect, upload.single("image"), createPost);

router.route('/:id')
  .get(getPostById)
  .put(protect, updatePost)
  .delete(protect, deletePost);

router.put('/:id/vote', protect, voteOnPost);
router.put('/:id/pledge', protect, pledgeToPost);
router.put('/:id/status', protect, updatePostStatus);
router.post('/:id/view', protect, addView);

export default router;

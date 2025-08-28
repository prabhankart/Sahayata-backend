// routes/postRoutes.js
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
import upload from '../middleware/uploadMiddleware.js';  // ✅ use Cloudinary config

const router = express.Router();

router.route('/')
  .get(getPosts)
  .post(protect, upload.single("image"), createPost);  // ✅ sends URL in req.file.path

router.route('/:id')
  .get(getPostById)
  .put(protect, upload.single("image"), updatePost)   // ✅ allow updating image too
  .delete(protect, deletePost);

router.put('/:id/vote', protect, voteOnPost);
router.put('/:id/pledge', protect, pledgeToPost);
router.put('/:id/status', protect, updatePostStatus);
router.post('/:id/view', protect, addView);

export default router;

import express from 'express';
import { registerUser, loginUser, getTopHelpers, getAllUsers, updateUserProfile, getUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllUsers);
router.get('/top-helpers', getTopHelpers);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/:id/profile', getUserProfile);
router.put('/profile', protect, updateUserProfile);

export default router;

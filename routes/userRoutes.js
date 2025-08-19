import express from 'express';
import { registerUser, loginUser, getTopHelpers, getAllUsers,updateUserProfile  } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.route('/').get(getAllUsers);
router.get('/top-helpers', getTopHelpers);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.route('/profile').put(protect, updateUserProfile);

export default router;
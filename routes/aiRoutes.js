import express from 'express';
import { suggestTitle } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/suggest-title', protect, suggestTitle);

export default router;
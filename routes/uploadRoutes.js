import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { protect } from '../middleware/authMiddleware.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sahayata-uploads',
    resource_type: 'auto',
    allowed_formats: ['jpeg', 'png', 'jpg', 'mp4', 'mov', 'avi'],
  },
});
const upload = multer({ storage });
const router = express.Router();

router.post('/', protect, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  res.status(200).json({ imageUrl: req.file.path });
});

export default router;

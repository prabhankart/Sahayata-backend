import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { protect } from '../middleware/authMiddleware.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sahayata-uploads',
    resource_type: 'auto', 
    // Add video formats to the list of allowed formats
    allowed_formats: ['jpeg', 'png', 'jpg', 'mp4', 'mov', 'avi'],
  },
});

const upload = multer({ storage });
const router = express.Router();

// The upload endpoint
router.post('/', protect, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  // Send back the secure URL of the uploaded file
  res.status(200).json({ imageUrl: req.file.path });
});

export default router;
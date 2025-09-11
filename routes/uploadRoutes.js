import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { protect } from "../middleware/authMiddleware.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sahayata-uploads",
    resource_type: "auto", // handles images, video, etc
    allowed_formats: ["jpeg", "png", "jpg", "mp4", "mov", "avi", "pdf"],
  },
});

const upload = multer({ storage });
const router = express.Router();

// ✅ Upload route
router.post("/", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    return res.status(200).json({
      url: req.file.path, // Cloudinary gives the hosted URL here
      type: req.file.mimetype,
      name: req.file.originalname,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

export default router;

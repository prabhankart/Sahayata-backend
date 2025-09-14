// middleware/uploadMiddleware.js
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage (handles images, video, audio, pdf)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sahayata-uploads",
    resource_type: "auto",
    // keep this open since chat can send many types
    allowed_formats: ["jpg", "jpeg", "png", "gif", "mp4", "mov", "avi", "mp3", "wav", "pdf"],
  },
});

// (Optional) light filter — most types are allowed already
const upload = multer({ storage });

export default upload;

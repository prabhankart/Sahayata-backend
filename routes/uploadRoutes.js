// routes/uploadRoutes.js
import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Accept either "file" or "image" field names
router.post(
  "/",
  protect,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const f =
        (req.files && req.files.file && req.files.file[0]) ||
        (req.files && req.files.image && req.files.image[0]);

      if (!f) return res.status(400).json({ message: "No file uploaded." });

      // Cloudinary's multer adapter puts the hosted URL on `path` (and sometimes `secure_url`)
      const url = f.path || f.secure_url;
      return res.status(200).json({
        url,                 // ← your GroupPage uses `data.url || data.imageUrl`
        imageUrl: url,       // backward-friendly
        type: f.mimetype,
        name: f.originalname || f.filename || "file",
        public_id: f.filename, // Cloudinary public id
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ message: "Upload failed", error: err.message });
    }
  }
);

export default router;

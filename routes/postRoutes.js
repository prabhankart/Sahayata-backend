import express from "express";
import { protect } from "../middleware/authMiddleware.js";
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
} from "../controllers/postController.js";
import upload from "../middleware/uploadMiddleware.js";
import Post from "../models/Post.js";

const router = express.Router();

/* ---------- My Posts (for the chat PostPicker) ---------- */
router.get("/mine", protect, async (req, res) => {
  try {
    const rows = await Post.find({
      $or: [
        { author: req.user._id },
        { user: req.user._id },
        { createdBy: req.user._id },
        { owner: req.user._id },
      ],
    })
      .sort({ updatedAt: -1 })
      .select("_id title status coverUrl imageUrl image images createdAt")
      .lean();

    const list = rows.map((p) => ({
      _id: p._id,
      title: p.title,
      status: p.status || "Open",
      coverUrl:
        p.coverUrl ||
        p.imageUrl ||
        p.image ||
        (Array.isArray(p.images) && p.images.length ? p.images[0] : null),
      createdAt: p.createdAt,
    }));

    res.json(list);
  } catch (e) {
    console.error("GET /api/posts/mine", e);
    res.status(500).json({ message: "Failed to load posts" });
  }
});

/* ---------- Collection ---------- */
router
  .route("/")
  .get(getPosts)
  .post(protect, upload.single("image"), createPost);

/* ---------- Per-post actions (specific subpaths) ---------- */
router.put("/:id/vote", protect, voteOnPost);
router.put("/:id/pledge", protect, pledgeToPost);
router.put("/:id/status", protect, updatePostStatus);
router.post("/:id/view", protect, addView);

/* ---------- Single post (keep LAST) ---------- */
router
  .route("/:id")
  .get(getPostById)
  .put(protect, upload.single("image"), updatePost)
  .delete(protect, deletePost);

export default router;

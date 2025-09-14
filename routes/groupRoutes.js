// routes/groupRoutes.js
import express from "express";
import rateLimit from "express-rate-limit";
import {
  createGroup,
  listGroups,
  getGroup,
  joinGroup,
  leaveGroup,
  listGroupMessages,
  createGroupMessage,
  getRecommendedGroups,
  pledgeHelp,
  unpledgeHelp,
  updateGroupMeta,
  markGroupRead,         // STAGE0
  getGroupUnread,        // STAGE0
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* --------------------------- STAGE 0: Rate caps --------------------------- */
/** Build a limiter with consistent key + friendly JSON handler */
function makeMsgLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Don’t count 4xx/5xx failures—mostly useful during development or validation errors.
    skipFailedRequests: true,
    keyGenerator: (req) => {
      const uid = req.user?._id?.toString();
      const gid = req.params.groupId || "nogroup";
      // fall back to IP if somehow no user (shouldn’t happen since protect runs first)
      const ip = req.ip || "noip";
      return uid ? `g:${gid}:u:${uid}` : `g:${gid}:ip:${ip}`;
    },
    handler: (req, res /*, next, options*/) => {
      // express-rate-limit v6 exposes req.rateLimit info
      const retryAfter =
        (req.rateLimit?.resetTime &&
          Math.max(0, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000))) ||
        res.getHeader("Retry-After") ||
        undefined;

      return res.status(429).json({
        message: "You’re sending messages too fast. Please wait a moment and try again.",
        retryAfter, // seconds (if available)
        windowMs,
        limit: max,
      });
    },
  });
}

// 1 msg/sec per user per group
const burstLimiter = makeMsgLimiter({ windowMs: 1 * 1000, max: 1 });
// 30 msgs/min per user per group
const minuteLimiter = makeMsgLimiter({ windowMs: 60 * 1000, max: 30 });

/* --------------------------------- Routes -------------------------------- */
router.get("/", protect, listGroups);
router.get("/recommended", protect, getRecommendedGroups);
router.post("/", protect, createGroup);

router.get("/:groupId", protect, getGroup);
router.post("/:groupId/join", protect, joinGroup);
router.post("/:groupId/leave", protect, leaveGroup);

router.post("/:groupId/pledge", protect, pledgeHelp);
router.post("/:groupId/unpledge", protect, unpledgeHelp);
router.patch("/:groupId/meta", protect, updateGroupMeta);

// STAGE0 (Ordering + Pagination)
router.get("/:groupId/messages", protect, listGroupMessages);

// STAGE0 (Rate caps + Media limits enforced in controller)
router.post(
  "/:groupId/messages",
  protect,
  burstLimiter,
  minuteLimiter,
  createGroupMessage
);

// STAGE0 (Read state)
router.post("/:groupId/read", protect, markGroupRead);
router.get("/:groupId/unread", protect, getGroupUnread);

export default router;

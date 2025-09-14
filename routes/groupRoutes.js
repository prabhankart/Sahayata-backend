// routes/groupRoutes.js
import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
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
  markGroupRead,   // STAGE0
  getGroupUnread,  // STAGE0
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------- STAGE0 (Rate caps, IPv6 safe) -------------------- */
const makeMsgLimiter = (max, windowMs) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      // ✅ normalize IP + user + group
      return (
        ipKeyGenerator(req, res) +
        `:g:${req.params.groupId || "no-group"}:u:${req.user?._id?.toString() || "anon"}`
      );
    },
  });

const burstLimiter = makeMsgLimiter(1, 1 * 1000);     // 1 per sec per user per group
const minuteLimiter = makeMsgLimiter(30, 60 * 1000);  // 30 per min per user per group

/* --------------------------- Group routes --------------------------- */
router.get("/", protect, listGroups);
router.get("/recommended", protect, getRecommendedGroups);
router.post("/", protect, createGroup);

router.get("/:groupId", protect, getGroup);
router.post("/:groupId/join", protect, joinGroup);
router.post("/:groupId/leave", protect, leaveGroup);

router.post("/:groupId/pledge", protect, pledgeHelp);
router.post("/:groupId/unpledge", protect, unpledgeHelp);
router.patch("/:groupId/meta", protect, updateGroupMeta);

/* --------------------------- Messages --------------------------- */
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

/* --------------------------- Read state --------------------------- */
// STAGE0 (Read tracking)
router.post("/:groupId/read", protect, markGroupRead);
router.get("/:groupId/unread", protect, getGroupUnread);

export default router;

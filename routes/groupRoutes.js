// routes/groupRoutes.js
import express from "express";
import {
  createGroup, listGroups, getGroup,
  joinGroup, leaveGroup,
  listGroupMessages, createGroupMessage,
  getRecommendedGroups,         // new
  pledgeHelp, unpledgeHelp,     // new
  updateGroupMeta,              // new
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, listGroups);
router.get("/recommended", protect, getRecommendedGroups);
router.post("/", protect, createGroup);

router.get("/:groupId", protect, getGroup);
router.post("/:groupId/join", protect, joinGroup);
router.post("/:groupId/leave", protect, leaveGroup);

router.post("/:groupId/pledge", protect, pledgeHelp);
router.post("/:groupId/unpledge", protect, unpledgeHelp);
router.patch("/:groupId/meta", protect, updateGroupMeta);

router.get("/:groupId/messages", protect, listGroupMessages);
router.post("/:groupId/messages", protect, createGroupMessage);

export default router;

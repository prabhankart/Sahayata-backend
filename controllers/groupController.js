// controllers/groupController.js
import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";

/* ------- Recommended defaults (created once) ------- */
const SYSTEM_USER_ID = new mongoose.Types.ObjectId("000000000000000000000001");
const DEFAULT_GROUPS = [
  { name: "Environment Protection", category: "Environment", description: "Cleanups, trees, recycling." },
  { name: "Tech & Digital Help", category: "Technology", description: "Phones, laptops, internet, basics." },
  { name: "Local Mutual Aid", category: "Community", description: "Groceries, transport, emergencies." },
  { name: "Education & Tutoring", category: "Education", description: "Tutors, study groups, resources." },
  { name: "Health & Wellness", category: "Health", description: "Check-ins, walks, first-aid basics." },
];
async function ensureDefaultGroups() {
  for (const g of DEFAULT_GROUPS) {
    await Group.findOneAndUpdate(
      { name: g.name },
      { $setOnInsert: { ...g, createdBy: SYSTEM_USER_ID, members: [] } },
      { upsert: true, new: true }
    );
  }
}
export const getRecommendedGroups = async (_req, res) => {
  try { await ensureDefaultGroups(); const data = await Group.find({ name: { $in: DEFAULT_GROUPS.map(d=>d.name) } }); res.json(data); }
  catch { res.status(500).json({ message: "Server Error" }); }
}
/* --------------------------------------------------- */

export const createGroup = async (req, res) => {
  try {
    const { name, description = "", category = "General", problemTitle = "" } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    const group = await Group.create({
      name: name.trim(),
      description,
      category,
      problemTitle,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(group);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

export const listGroups = async (req, res) => {
  try {
    await ensureDefaultGroups();
    const { q = "", category, onlyJoined } = req.query;
    const me = req.user?._id;
    const filter = {};
    if (q) filter.$text = { $search: q };
    if (category && category !== "All") filter.category = category;
    if (onlyJoined === "true" && me) filter.members = me;

    const groups = await Group.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    res.json(groups);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

export const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("createdBy", "name")
      .populate("members", "name")
      .populate("pledgedHelpers", "name");
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

export const joinGroup = async (req, res) => {
  try {
    const me = req.user._id;
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { members: me } },
      { new: true }
    );
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

export const leaveGroup = async (req, res) => {
  try {
    const me = req.user._id;
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $pull: { members: me, pledgedHelpers: me } },
      { new: true }
    );
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

/* ------- ✨ New: pledge/unpledge helpers ------- */
export const pledgeHelp = async (req, res) => {
  try {
    const me = req.user._id;
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { pledgedHelpers: me }, $addToSet: { members: me } }, // auto-join on pledge
      { new: true }
    ).populate("pledgedHelpers", "name");
    if (!group) return res.status(404).json({ message: "Group not found" });

    // push live update
    const io = req.app.get("io");
    if (io) io.to(`group:${req.params.groupId}`).emit("group:update", { pledgedHelpers: group.pledgedHelpers });

    res.json(group);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

export const unpledgeHelp = async (req, res) => {
  try {
    const me = req.user._id;
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $pull: { pledgedHelpers: me } },
      { new: true }
    ).populate("pledgedHelpers", "name");
    if (!group) return res.status(404).json({ message: "Group not found" });

    const io = req.app.get("io");
    if (io) io.to(`group:${req.params.groupId}`).emit("group:update", { pledgedHelpers: group.pledgedHelpers });

    res.json(group);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

/* ------- ✨ New: update group meta (status/problemTitle) ------- */
export const updateGroupMeta = async (req, res) => {
  try {
    const me = req.user._id;
    const { status, problemTitle, description } = req.body;

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // allow any member to update status/title/desc (tweak as needed)
    const isMember = (group.members || []).some((id) => id.toString() === me.toString());
    if (!isMember) return res.status(403).json({ message: "Join group to update" });

    if (status) group.status = status;
    if (problemTitle !== undefined) group.problemTitle = problemTitle;
    if (description !== undefined) group.description = description;
    await group.save();

    const populated = await Group.findById(group._id)
      .populate("createdBy", "name")
      .populate("members", "name")
      .populate("pledgedHelpers", "name");

    const io = req.app.get("io");
    if (io) io.to(`group:${req.params.groupId}`).emit("group:update", {
      status: populated.status,
      problemTitle: populated.problemTitle,
      description: populated.description,
    });

    res.json(populated);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

/* -------- Group Messages -------- */
export const listGroupMessages = async (req, res) => {
  try {
    const msgs = await GroupMessage.find({ group: req.params.groupId })
      .sort({ createdAt: 1 })
      .limit(300)
      .populate("sender", "name avatar")
      .populate("replyTo", "text sender")
      .lean();
    res.json(msgs);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

export const createGroupMessage = async (req, res) => {
  try {
    const { text, clientId, replyTo } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Text is required" });

    const group = await Group.findById(req.params.groupId).lean();
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = (group.members || []).some((id) => id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: "Join group to chat" });

    const msg = await GroupMessage.create({
      group: req.params.groupId,
      sender: req.user._id,
      text: text.trim(),
      clientId: clientId || undefined,
      replyTo: replyTo || null,
    });

    await Group.findByIdAndUpdate(req.params.groupId, { $set: { lastMessageAt: new Date() } });
    const populated = await msg.populate([{ path: "sender", select: "name avatar" }, { path: "replyTo", select: "text sender" }]);

    const io = req.app.get("io");
    if (io) io.to(`group:${req.params.groupId}`).emit("group:message", populated);

    res.status(201).json(populated);
  } catch { res.status(500).json({ message: "Server Error" }); }
};

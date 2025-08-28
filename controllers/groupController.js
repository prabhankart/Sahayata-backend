// controllers/groupController.js
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";

export const createGroup = async (req, res) => {
  try {
    const { name, description = "", category = "General" } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    const group = await Group.create({
      name: name.trim(),
      description,
      category,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json(group);
  } catch (e) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const listGroups = async (req, res) => {
  try {
    const { q = "", category, onlyJoined } = req.query;
    const me = req.user?._id;
    const filter = {};

    if (q) filter.$text = { $search: q };
    if (category && category !== "All") filter.category = category;
    if (onlyJoined === "true" && me) filter.members = me;

    const groups = await Group.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(groups);
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("createdBy", "name")
      .populate("members", "name");
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
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
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const me = req.user._id;
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $pull: { members: me } },
      { new: true }
    );
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* -------- Group Messages -------- */
export const listGroupMessages = async (req, res) => {
  try {
    const msgs = await GroupMessage.find({ group: req.params.groupId })
      .sort({ createdAt: 1 })
      .limit(200)
     .populate("sender", "name avatar")

      .lean();
    res.json(msgs);
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const createGroupMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Text is required" });

    // ensure member
    const group = await Group.findById(req.params.groupId).lean();
    if (!group) return res.status(404).json({ message: "Group not found" });
    const isMember = (group.members || []).some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: "Join group to chat" });

    const msg = await GroupMessage.create({
  group: req.params.groupId,
  sender: req.user._id,
  text: text.trim(),
});


 const populated = await msg.populate({ path: "sender", select: "name avatar" });


    // broadcast to room
    const io = req.app.get("io");
    if (io) io.to(`group:${req.params.groupId}`).emit("group:message", populated);

    res.status(201).json(populated);
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

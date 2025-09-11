import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";

const STATUSES = ["Open", "In Progress", "Resolved", "On Hold"];

/* ----------------------------- Groups (CRUD) ----------------------------- */
export async function createGroup(req, res) {
  try {
    const { name, description = "", category = "" } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Group name is required." });

    const g = await Group.create({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      status: "Open",
      members: [req.user._id],
      pledgedHelpers: [],
    });

    res.status(201).json(g);
  } catch (e) {
    console.error("createGroup", e);
    res.status(500).json({ message: "Failed to create group." });
  }
}

export async function listGroups(req, res) {
  try {
    const { q, onlyJoined, category } = req.query;
    const filter = {};

    if (q?.trim()) {
      const rx = new RegExp(q.trim(), "i");
      filter.$or = [{ name: rx }, { description: rx }, { category: rx }];
    }
    if (category && category !== "All") filter.category = category;

    if (String(onlyJoined) === "true") {
      filter.members = { $in: [req.user._id] };
    }

    const docs = await Group.find(filter).sort({ updatedAt: -1, createdAt: -1 }).limit(100).lean();
    res.json(docs);
  } catch (e) {
    console.error("listGroups", e);
    res.status(500).json({ message: "Failed to load groups." });
  }
}

export async function getGroup(req, res) {
  try {
    const g = await Group.findById(req.params.groupId).lean();
    if (!g) return res.status(404).json({ message: "Group not found." });
    res.json(g);
  } catch (e) {
    console.error("getGroup", e);
    res.status(500).json({ message: "Failed to load group." });
  }
}

export async function joinGroup(req, res) {
  try {
    const g = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { members: req.user._id } },
      { new: true }
    ).lean();
    if (!g) return res.status(404).json({ message: "Group not found." });
    res.json(g);
  } catch (e) {
    console.error("joinGroup", e);
    res.status(500).json({ message: "Could not join group." });
  }
}

export async function leaveGroup(req, res) {
  try {
    const g = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $pull: { members: req.user._id } },
      { new: true }
    ).lean();
    if (!g) return res.status(404).json({ message: "Group not found." });
    res.json(g);
  } catch (e) {
    console.error("leaveGroup", e);
    res.status(500).json({ message: "Could not leave group." });
  }
}

export async function getRecommendedGroups(req, res) {
  try {
    // naive "recommended": top by members count / recent
    const docs = await Group.aggregate([
      { $addFields: { membersCount: { $size: { $ifNull: ["$members", []] } } } },
      { $sort: { membersCount: -1, updatedAt: -1 } },
      { $limit: 6 },
    ]);
    res.json(docs);
  } catch (e) {
    console.error("getRecommendedGroups", e);
    res.status(500).json({ message: "Failed to load recommendations." });
  }
}

export async function pledgeHelp(req, res) {
  try {
    const g = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { pledgedHelpers: req.user._id } },
      { new: true }
    ).lean();
    if (!g) return res.status(404).json({ message: "Group not found." });
    res.json(g);
  } catch (e) {
    console.error("pledgeHelp", e);
    res.status(500).json({ message: "Failed to pledge." });
  }
}

export async function unpledgeHelp(req, res) {
  try {
    const g = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $pull: { pledgedHelpers: req.user._id } },
      { new: true }
    ).lean();
    if (!g) return res.status(404).json({ message: "Group not found." });
    res.json(g);
  } catch (e) {
    console.error("unpledgeHelp", e);
    res.status(500).json({ message: "Failed to unpledge." });
  }
}

export async function updateGroupMeta(req, res) {
  try {
    const { status } = req.body;
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    const patch = {};
    if (status) patch.status = status;

    const g = await Group.findByIdAndUpdate(req.params.groupId, { $set: patch }, { new: true }).lean();
    if (!g) return res.status(404).json({ message: "Group not found." });
    res.json(g);
  } catch (e) {
    console.error("updateGroupMeta", e);
    res.status(500).json({ message: "Failed to update group." });
  }
}

/* --------------------------- Group Messages (HTTP) --------------------------- */
export async function listGroupMessages(req, res) {
  try {
    const { groupId } = req.params;

    const docs = await GroupMessage.find({ group: groupId })
      .sort({ createdAt: 1 })
      .populate({ path: "sender", select: "name avatar" })
      .populate({
        path: "replyTo",
        select: "text sender",
        populate: { path: "sender", select: "name avatar" },
      })
      .lean();

    const shaped = docs.map((m) => ({
      ...m,
      sender: m.sender ? { _id: m.sender._id, name: m.sender.name } : undefined,
      replyTo: m.replyTo
        ? {
            _id: m.replyTo._id,
            text: m.replyTo.text,
            sender: m.replyTo.sender
              ? { _id: m.replyTo.sender._id, name: m.replyTo.sender.name }
              : undefined,
          }
        : null,
    }));

    res.json(shaped);
  } catch (e) {
    console.error("listGroupMessages", e);
    res.status(500).json({ message: "Failed to load chat history." });
  }
}

export async function createGroupMessage(req, res) {
  try {
    const { groupId } = req.params;
    const { text = "", attachments = [], replyTo = null, clientId = null } = req.body;

    const msg = await GroupMessage.create({
      group: groupId,
      sender: req.user._id,
      text,
      attachments,
      replyTo,
      clientId,
    });

    await msg.populate([
      { path: "sender", select: "name avatar" },
      {
        path: "replyTo",
        select: "text sender",
        populate: { path: "sender", select: "name avatar" },
      },
    ]);

    const payload = {
      ...msg.toObject(),
      sender: { _id: msg.sender._id, name: msg.sender.name },
      replyTo: msg.replyTo
        ? {
            _id: msg.replyTo._id,
            text: msg.replyTo.text,
            sender: msg.replyTo.sender
              ? { _id: msg.replyTo.sender._id, name: msg.replyTo.sender.name }
              : undefined,
          }
        : null,
    };

    // broadcast to socket room used by the UI: group:${groupId}
    const io = req.app.get("io");
    if (io) io.to(`group:${groupId}`).emit("group:message", payload);

    res.json(payload);
  } catch (e) {
    console.error("createGroupMessage", e);
    res.status(500).json({ message: "Failed to send message." });
  }
}

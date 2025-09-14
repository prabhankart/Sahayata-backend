// controllers/groupController.js
import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import GroupReadState from "../models/GroupReadState.js"; // optional read state
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
    if (String(onlyJoined) === "true") filter.members = { $in: [req.user._id] };

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

    // initialize read cursor (optional)
    await GroupReadState.updateOne(
      { group: g._id, user: req.user._id },
      { $setOnInsert: { lastReadAt: new Date() } },
      { upsert: true }
    );

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

// STAGE0: ordering + pagination
export async function listGroupMessages(req, res) {
  try {
    const { groupId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const docs = await GroupMessage.find({ group: groupId, createdAt: { $lt: before } })
      .sort({ createdAt: -1 }) // newest first over the wire
      .limit(limit)
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

    const nextBefore = shaped.length ? shaped[shaped.length - 1].createdAt : null;

    res.json({ data: shaped, nextBefore });
  } catch (e) {
    console.error("listGroupMessages", e);
    res.status(500).json({ message: "Failed to load chat history." });
  }
}

/* ------------------------------ Helpers ---------------------------------- */
const ALLOWED_TYPES = new Set(["image", "video", "audio", "file", "post"]);
const MAX_MB = 10;

// ✅ keep "post" items even without url; require url for media/files only
function sanitizeAttachments(arr = []) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const a of arr) {
    if (!a || !ALLOWED_TYPES.has(a.type)) continue;

    if (a.type === "post" && a.postRef && a.postRef._id) {
      out.push({
        type: "post",
        postRef: {
          _id: a.postRef._id,
          title: String(a.postRef.title || "").slice(0, 200),
          status: a.postRef.status || "Open",
          authorName: a.postRef.authorName || "",
          coverUrl: a.postRef.coverUrl || null,
        },
      });
      continue;
    }

    if (["image", "video", "audio", "file"].includes(a.type)) {
      if (!a.url) continue;
      const size = Number.isFinite(a.size) ? Number(a.size) : 0;
      if (size && size > MAX_MB * 1024 * 1024) continue;

      out.push({
        type: a.type,
        url: a.url,
        name: a.name || "",
        mime: a.mime || "",
        size: size || undefined,
      });
      continue;
    }
  }
  return out;
}

// STAGE0: create + dedupe + media limits
export async function createGroupMessage(req, res) {
  try {
    const { groupId } = req.params;
    const { text = "", attachments = [], replyTo = null, clientId = null } = req.body;

    const cleanAttachments = sanitizeAttachments(attachments);

    if (!text?.trim() && cleanAttachments.length === 0) {
      return res.status(400).json({ message: "Message must have text or attachments." });
    }

    // return existing if same clientId already saved
    if (clientId) {
      const existing = await GroupMessage.findOne({ group: groupId, clientId })
        .populate([{ path: "sender", select: "name avatar" }])
        .lean();
      if (existing) {
        return res.json({
          ...existing,
          sender: existing.sender ? { _id: existing.sender._id, name: existing.sender.name } : undefined,
        });
      }
    }

    const msg = await GroupMessage.create({
      group: groupId,
      sender: req.user._id,
      text: text || "",
      attachments: cleanAttachments, // ✅ ONLY the sanitized attachments
      replyTo: replyTo || null,
      clientId: clientId || undefined,
    });

    await Group.findByIdAndUpdate(groupId, { $set: { lastMessageAt: new Date() } });

    const populated = await GroupMessage.findById(msg._id)
      .populate([{ path: "sender", select: "name avatar" }])
      .populate({
        path: "replyTo",
        select: "text sender",
        populate: { path: "sender", select: "name avatar" },
      })
      .lean();

    const payload = {
      ...populated,
      sender: populated.sender ? { _id: populated.sender._id, name: populated.sender.name } : undefined,
      replyTo: populated.replyTo
        ? {
            _id: populated.replyTo._id,
            text: populated.replyTo.text,
            sender: populated.replyTo.sender
              ? { _id: populated.replyTo.sender._id, name: populated.replyTo.sender.name }
              : undefined,
          }
        : null,
    };

    const io = req.app.get("io");
    if (io) io.to(`group:${groupId}`).emit("group:message", payload);

    res.json(payload);
  } catch (e) {
    // de-dupe via unique index
    if (e && e.code === 11000 && e.keyPattern?.group && e.keyPattern?.clientId) {
      try {
        const found = await GroupMessage.findOne({
          group: req.params.groupId,
          clientId: req.body.clientId,
        })
          .populate([{ path: "sender", select: "name avatar" }])
          .populate({
            path: "replyTo",
            select: "text sender",
            populate: { path: "sender", select: "name avatar" },
          })
          .lean();
        if (found) {
          return res.json({
            ...found,
            sender: found.sender ? { _id: found.sender._id, name: found.sender.name } : undefined,
            replyTo: found.replyTo
              ? {
                  _id: found.replyTo._id,
                  text: found.replyTo.text,
                  sender: found.replyTo.sender
                    ? { _id: found.replyTo.sender._id, name: found.replyTo.sender.name }
                    : undefined,
                }
              : null,
          });
        }
      } catch {}
    }

    console.error("createGroupMessage", e);
    res.status(500).json({ message: "Failed to send message." });
  }
}

/* --------------------------- Read state (optional) --------------------------- */
export async function markGroupRead(req, res) {
  try {
    const { groupId } = req.params;
    const now = new Date();
    await GroupReadState.updateOne(
      { group: groupId, user: req.user._id },
      { $set: { lastReadAt: now } },
      { upsert: true }
    );
    res.json({ ok: true, lastReadAt: now });
  } catch (e) {
    console.error("markGroupRead", e);
    res.status(500).json({ message: "Failed to update read state." });
  }
}

export async function getGroupUnread(req, res) {
  try {
    const { groupId } = req.params;
    const read = await GroupReadState.findOne({ group: groupId, user: req.user._id }).lean();
    const since = read?.lastReadAt || new Date(0);
    const count = await GroupMessage.countDocuments({ group: groupId, createdAt: { $gt: since } });
    res.json({ unread: count });
  } catch (e) {
    console.error("getGroupUnread", e);
    res.status(500).json({ message: "Failed to load unread count." });
  }
}

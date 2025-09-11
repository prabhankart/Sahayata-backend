import Message from "../models/Message.js";

const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/** GET /api/messages/post/:postId — room history (hides “delete for me”) */
export const getMessagesForPost = async (req, res) => {
  try {
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (p - 1) * l;

    const messages = await Message.find({
      post: req.params.postId,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(l);

    res.json(messages);
  } catch (e) {
    res.status(500).json({ message: "Server Error" });
  }
};

/** PATCH /api/messages/:messageId — edit (sender only, not if deletedForEveryone) */
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text = "" } = req.body;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (msg.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not allowed" });

    if (msg.deletedForEveryone)
      return res.status(400).json({ message: "Cannot edit a deleted message" });

    msg.text = String(text).trim();
    msg.edited = true;
    await msg.save();

    const io = req.app.get("io");
    const payload = { messageId: msg._id.toString(), text: msg.text };
    if (msg.post) io.to(msg.post.toString()).emit("messageEdited", payload);
    if (msg.conversation) io.to(msg.conversation.toString()).emit("messageEdited", payload);

    res.json({ ok: true, message: msg });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/** PATCH /api/messages/:messageId/reactions — toggle emoji reaction */
export const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!ALLOWED_REACTIONS.includes(emoji))
      return res.status(400).json({ message: "Invalid emoji" });

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const me = req.user._id.toString();
    const has = (msg.reactions || []).some(
      (r) => r.emoji === emoji && r.user.toString() === me
    );

    if (has) {
      msg.reactions = msg.reactions.filter(
        (r) => !(r.emoji === emoji && r.user.toString() === me)
      );
    } else {
      msg.reactions.push({ user: req.user._id, emoji });
    }
    await msg.save();

    const io = req.app.get("io");
    const payload = { messageId: msg._id.toString(), reactions: msg.reactions };
    if (msg.post) io.to(msg.post.toString()).emit("messageReacted", payload);
    if (msg.conversation) io.to(msg.conversation.toString()).emit("messageReacted", payload);

    res.json({ ok: true, reactions: msg.reactions });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/** DELETE /api/messages/:messageId/me — delete for me */
export const deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const me = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (!msg.deletedFor.map(String).includes(String(me))) {
      msg.deletedFor.push(me);
      await msg.save();
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/** DELETE /api/messages/:messageId/all — delete for everyone (sender only) */
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const me = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (msg.sender.toString() !== me.toString())
      return res.status(403).json({ message: "Not allowed" });

    if (!msg.deletedForEveryone) {
      msg.deletedForEveryone = true;
      msg.text = "";
      msg.attachments = [];
      await msg.save();

      const io = req.app.get("io");
      const payload = { messageId: msg._id.toString(), mode: "all" };
      if (msg.post) io.to(msg.post.toString()).emit("messageDeleted", payload);
      if (msg.conversation) io.to(msg.conversation.toString()).emit("messageDeleted", payload);
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/** DELETE /api/messages/post/:postId/me — clear room for me */
export const clearPostForMe = async (req, res) => {
  try {
    const { postId } = req.params;
    const me = req.user._id;
    await Message.updateMany(
      { post: postId, deletedFor: { $ne: me } },
      { $addToSet: { deletedFor: me } }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/** DELETE /api/messages/post/:postId/all — clear room for everyone (keeps placeholders) */
export const clearPostForEveryone = async (req, res) => {
  try {
    const { postId } = req.params;

    await Message.updateMany(
      { post: postId, deletedForEveryone: { $ne: true } },
      { $set: { deletedForEveryone: true, text: "", attachments: [] } }
    );

    const io = req.app.get("io");
    io.to(postId.toString()).emit("messageDeleted", { messageId: null, mode: "all:post" });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

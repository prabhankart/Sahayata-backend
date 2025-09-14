import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export const getConversations = async (req, res) => {
  try {
    const me = req.user._id instanceof mongoose.Types.ObjectId
      ? req.user._id
      : new mongoose.Types.ObjectId(req.user._id);

    const convos = await Conversation.find({ participants: me })
      .populate('participants', 'name avatar')
      .sort({ updatedAt: -1 })
      .lean();

    if (!convos.length) return res.json([]);

    const ids = convos.map(c => c._id);

    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversation: { $in: ids },
          sender: { $ne: me },               // only from the other user
          deletedForEveryone: { $ne: true },
          readBy: { $nin: [me] },            // not read by me
          deletedFor: { $nin: [me] },        // not hidden for me
        }
      },
      { $group: { _id: '$conversation', count: { $sum: 1 } } }
    ]);

    const map = Object.fromEntries(unreadAgg.map(u => [String(u._id), u.count]));
    const withCounts = convos.map(c => ({
      ...c,
      unreadCount: map[String(c._id)] || 0
    }));

    res.json(withCounts);
  } catch (e) {
    console.error('getConversations error:', e);
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

export const startOrGetConversation = async (req, res) => {
  try {
    const me = String(req.user._id);
    const otherUserId = String(req.params.recipientId);
    const key = [me, otherUserId].sort().join(':');

    const convo = await Conversation.findOneAndUpdate(
      { participantsKey: key },
      { $setOnInsert: { participants: [me, otherUserId], participantsKey: key } },
      { new: true, upsert: true }
    ).populate('participants', 'name avatar');

    res.json(convo);
  } catch (e) {
    console.error('startOrGetConversation error:', e);
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    // Normalize IDs to ObjectId (prevents equality issues)
    const me = req.user._id instanceof mongoose.Types.ObjectId
      ? req.user._id
      : new mongoose.Types.ObjectId(req.user._id);
    const convoId = new mongoose.Types.ObjectId(req.params.conversationId);

    // ✅ Persist read state: mark all incoming messages as read for me
    const result = await Message.updateMany(
      {
        conversation: convoId,
        sender: { $ne: me },
        readBy: { $nin: [me] },
        deletedForEveryone: { $ne: true },
        deletedFor: { $nin: [me] },
      },
      { $addToSet: { readBy: me } }
    );

    // 🔔 Tell the room that messages were read (real-time ✓✓)
    if (result.modifiedCount > 0) {
      const io = req.app.get('io');
      io.to(convoId.toString()).emit('messagesRead', {
        conversationId: convoId.toString(),
        readerId: me.toString(),
      });
    }

    // Fetch page
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (p - 1) * l;

    let docs = await Message.find({ conversation: convoId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);

    // Filter/mask for current user
    docs = docs
      .filter(m => !(m.deletedFor || []).some(id => String(id) === String(me)))
      .map(m =>
        m.deletedForEveryone
          ? { ...m.toObject(), text: '🚫 Message deleted', attachments: [] }
          : m.toObject()
      );

    res.json({ data: docs.reverse(), page: p });
  } catch (e) {
    console.error('getConversationMessages error:', e);
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

// Optional: explicit mark-as-read if you want to call it elsewhere
export const markConversationRead = async (req, res) => {
  try {
    const me = req.user._id instanceof mongoose.Types.ObjectId
      ? req.user._id
      : new mongoose.Types.ObjectId(req.user._id);

    const { conversationId } = req.params;
    const convoId = new mongoose.Types.ObjectId(conversationId);

    const result = await Message.updateMany(
      {
        conversation: convoId,
        sender: { $ne: me },
        readBy: { $nin: [me] },
        deletedForEveryone: { $ne: true },
        deletedFor: { $nin: [me] },
      },
      { $addToSet: { readBy: me } }
    );

    // 🔔 Emit only if anything changed
    if (result.modifiedCount > 0) {
      const io = req.app.get('io');
      io.to(convoId.toString()).emit('messagesRead', {
        conversationId: convoId.toString(),
        readerId: me.toString(),
      });
    }

    res.json({ ok: true, modified: result.modifiedCount || 0 });
  } catch (e) {
    console.error('markConversationRead error:', e);
    res.status(500).json({ message: 'Server Error', error: e.message });
  }
};

import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export const getConversations = async (req, res) => {
  try {
    const me = req.user._id;
    const items = await Conversation.find({ participants: me })
      .populate('participants', 'name avatar')
      .sort({ updatedAt: -1 });
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const startOrGetConversation = async (req, res) => {
  try {
    const me = req.user._id.toString();
    const otherUserId = String(req.params.recipientId);
    const key = [me, otherUserId].sort().join(':');

    const convo = await Conversation.findOneAndUpdate(
      { participantsKey: key },
      { $setOnInsert: { participants: [me, otherUserId], participantsKey: key } },
      { new: true, upsert: true }
    ).populate('participants', 'name avatar');

    res.json(convo);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const me = req.user._id;
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (p - 1) * l;

    let docs = await Message.find({ conversation: req.params.conversationId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);

    // filter / mask
    docs = docs
      .filter(m => !m.deletedFor.includes(me))
      .map(m => m.deletedForEveryone ? { ...m.toObject(), text: '🚫 Message deleted', attachments: [] } : m);

    res.json({ data: docs.reverse(), page: p });
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

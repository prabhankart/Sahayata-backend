import Message from '../models/Message.js';

export const getMessagesForPost = async (req, res) => {
  try {
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (p - 1) * l;

    const messages = await Message.find({ post: req.params.postId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);

    res.json({ data: messages.reverse(), page: p });
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

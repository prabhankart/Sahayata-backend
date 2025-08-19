import Message from '../models/Message.js';

export const getMessagesForPost = async (req, res) => {
  try {
    const messages = await Message.find({ post: req.params.postId })
      .populate('sender', 'name')
      .sort({ createdAt: 'asc' });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
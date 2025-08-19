import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

// @desc    Get all conversations for a user
// @route   GET /api/conversations
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name');
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/conversations/:conversationId/messages
export const getConversationMessages = async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.conversationId })
      .populate('sender', 'name');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
export const startOrGetConversation = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const myId = req.user._id;

    // Find if a conversation already exists between the two users
    let conversation = await Conversation.findOne({
      participants: { $all: [myId, recipientId] },
    });

    // If no conversation exists, create one
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, recipientId],
      });
    }

    // Return the full conversation populated with participant details
    const fullConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name');

    res.status(200).json(fullConversation);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

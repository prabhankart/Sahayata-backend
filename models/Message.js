import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  // A message can belong to a post OR a conversation
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;
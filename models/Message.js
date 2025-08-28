import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
}, { timestamps: true });

messageSchema.index({ post: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);

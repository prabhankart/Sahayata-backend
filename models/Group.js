import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// search index
groupSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Group', groupSchema);

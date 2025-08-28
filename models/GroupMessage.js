// models/GroupMessage.js
import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        type: String, // URLs for uploaded images/videos
      },
    ],
  },
  { timestamps: true }
);

// Index for fast fetching by group
groupMessageSchema.index({ group: 1, createdAt: -1 });

export default mongoose.model('GroupMessage', groupMessageSchema);

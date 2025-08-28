// models/Post.js
import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: 'General' },
    urgency: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    image: { type: String },

    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },

    // votes / pledges
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pledgedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // analytics
    commentCount: { type: Number, default: 0 },
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewCount: { type: Number, default: 0 },

    // geo (optional)
    location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    default: undefined
  }
},
  },
  { timestamps: true }
);

postSchema.index({ location: '2dsphere' });

export default mongoose.model('Post', postSchema);

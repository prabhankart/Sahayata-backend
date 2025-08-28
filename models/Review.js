import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
}, { timestamps: true });

reviewSchema.index({ reviewee: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);

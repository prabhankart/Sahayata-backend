import Review from '../models/Review.js';
import User from '../models/User.js';
import Post from '../models/Post.js';

export const createReview = async (req, res) => {
  try {
    const { postId, revieweeId, rating, comment } = req.body;
    const post = await Post.findById(postId);
    if (!post || post.status !== 'Resolved') {
      return res.status(400).json({ message: 'Reviews allowed only for resolved posts' });
    }

    const review = await Review.create({
      post: postId,
      reviewer: req.user._id,
      reviewee: revieweeId,
      rating,
      comment,
    });

    const user = await User.findByIdAndUpdate(
      revieweeId,
      { $inc: { ratingSum: rating, numReviews: 1 } },
      { new: true }
    );
    user.averageRating = user.numReviews ? user.ratingSum / user.numReviews : 0;
    await user.save();

    res.status(201).json(review);
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getReviewsForUser = async (req, res) => {
  try {
    const items = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name avatar')
      .populate('post', 'title');
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

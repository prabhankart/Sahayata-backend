import Review from '../models/Review.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

// ... getReviewsForUser function is here ...

// @desc    Create a new review
// @route   POST /api/reviews
export const getReviewsForUser = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new review
// @route   POST /api/reviews

export const createReview = async (req, res) => {
    const { postId, revieweeId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found.' });
        if (post.status !== 'Resolved') return res.status(400).json({ message: 'Reviews can only be left for resolved posts.' });

        const alreadyReviewed = await Review.findOne({ post: postId, reviewer: reviewerId, reviewee: revieweeId });
        if (alreadyReviewed) return res.status(400).json({ message: 'You have already reviewed this user for this post.' });

        const review = new Review({ post: postId, reviewer: reviewerId, reviewee: revieweeId, rating, comment });
        await review.save();

        // Update the reviewee's average rating
        const reviewee = await User.findById(revieweeId);
        const reviews = await Review.find({ reviewee: revieweeId });
        reviewee.numReviews = reviews.length;
        reviewee.averageRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
        await reviewee.save();

        res.status(201).json({ message: 'Review added successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
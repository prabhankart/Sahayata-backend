// controllers/commentController.js
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';

/** GET /api/comments/post/:postId */
export const getCommentsForPost = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })
      .populate('user', 'name');
    res.json(comments);
  } catch (err) {
    console.error('getCommentsForPost error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

/** POST /api/comments  body: { postId, text } */
export const createComment = async (req, res) => {
  try {
    const { postId, text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text required' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      post: postId,
      user: req.user._id,
      text: text.trim(),
    });

    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    const populated = await comment.populate('user', 'name');
    res.status(201).json(populated);
  } catch (err) {
    console.error('createComment error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

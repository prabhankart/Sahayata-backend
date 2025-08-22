import Post from '../models/Post.js';

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
export const createPost = async (req, res) => {
  try {
  const { title, description, location, image, category, urgency } = req.body;


    const postData = {
      title,
      description,
      category, // Add to postData
      urgency,
      user: req.user._id,
       image,
    };

    // Add location to postData if it exists
    if (location && location.coordinates) {
      postData.location = {
        type: 'Point',
        coordinates: [location.coordinates[0], location.coordinates[1]], // [longitude, latitude]
      };
    }

    const post = new Post(postData);

    const createdPost = await post.save();
    res.status(201).json(createdPost);
  } catch (error) {
    console.error(error);
        console.error('Error in createPost:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Fetch all posts
// @route   GET /api/posts
// @access  Public
export const getPosts = async (req, res) => {
  try {
    const { search, lat, lng } = req.query;
    const filter = {};

    // 1. Text Search Logic
    if (search) {
      // Use $regex for case-insensitive text search in title and description
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // 2. Location Filtering Logic
    if (lat && lng) {
      // Use MongoDB's geospatial query to find posts near a point
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: 10000, // Find posts within a 10km radius
        },
      };
    }

    const posts = await Post.find(filter) // Apply the combined filter
      .populate('user', 'name')
      .populate('pledgedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Pledge or unpledge to a post
// @route   PUT /api/posts/:id/pledge
// @access  Private
// @desc    Pledge or unpledge to a post
// @route   PUT /api/posts/:id/pledge
// @access  Private
export const pledgeToPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isPledged = post.pledgedBy.some(id => id.toString() === req.user._id.toString());

    if (isPledged) {
      post.pledgedBy = post.pledgedBy.filter(id => id.toString() !== req.user._id.toString());
    } else {
      post.pledgedBy.push(req.user._id);
    }

    // --- THIS IS THE FIX ---
    // If this is an old post without a category or urgency, assign defaults before saving.
    if (!post.category) {
        post.category = 'Other';
    }
    if (!post.urgency) {
        post.urgency = 'Medium';
    }
    // --- END OF FIX ---

    const savedPost = await post.save();

    const populatedPost = await savedPost.populate([
        { path: 'user', select: 'name' },
        { path: 'pledgedBy', select: 'name' }
    ]);

    res.json(populatedPost);
  } catch (error) {
    console.error("Pledge Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
};
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name')
      .populate('pledgedBy', 'name');

    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ message: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
// ... at the end of the file, after getPostById

// @desc    Vote on a post
// @route   PUT /api/posts/:id/vote
// @access  Private
export const voteOnPost = async (req, res) => {
  try {
    const { voteType } = req.body; // 'up' or 'down'
    const post = await Post.findById(req.params.id);
    const userId = req.user._id;

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Remove user from both arrays first to handle vote changes
    post.upvotes.pull(userId);
    post.downvotes.pull(userId);

    // Add user to the correct array based on their vote
    if (voteType === 'up') {
      post.upvotes.push(userId);
    } else if (voteType === 'down') {
      post.downvotes.push(userId);
    }
    // If voteType is neither, it effectively removes the vote.

    await post.save();
    const updatedPost = await Post.findById(req.params.id).populate('user', 'name').populate('pledgedBy', 'name');
    res.json(updatedPost);

  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the logged-in user is the author of the post
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await post.deleteOne();

    res.json({ message: 'Post removed successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Update fields from request body
    post.title = req.body.title || post.title;
    post.description = req.body.description || post.description;
    post.image = req.body.image; // Allow image to be updated (can be an empty string to remove it)
    post.category = req.body.category || post.category; // Add category
    post.urgency = req.body.urgency || post.urgency;   // Add urgency
    
    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
// @access  Private
export const updatePostStatus = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });

    post.status = req.body.status || post.status; // e.g., "Resolved"
    await post.save();

    const populatedPost = await post.populate([
        { path: 'user', select: 'name' },
        { path: 'pledgedBy', select: 'name' }
    ]);
    res.json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
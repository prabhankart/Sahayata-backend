import Post from '../models/Post.js';

/** POST /api/posts */
export const createPost = async (req, res) => {
  try {
    const { title, description, category, urgency, image, location } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    // ✅ Safe location handling
    let loc = null;
    if (location) {
      if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        loc = { type: "Point", coordinates: location.coordinates };
      } else if (typeof location.lat === "number" && typeof location.lng === "number") {
        loc = { type: "Point", coordinates: [location.lng, location.lat] };
      }
    }

    const post = new Post({
      user: req.user._id,
      title,
      description,
      category: category || "Other",
      urgency: urgency || "Medium",
      image: image || "", // optional
      status: "Open",
      location: loc,      // only attach if valid
    });

    const saved = await post.save();
    const populated = await saved.populate([
      { path: "user", select: "name" },
      { path: "pledgedBy", select: "name" },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    console.error("createPost error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

/** GET /api/posts?search=&lat=&lng= */
export const getPosts = async (req, res) => {
  try {
    const { search, lat, lng } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ title: regex }, { description: regex }, { category: regex }];
    }

    let cursor = Post.find(query);

    if (lat && lng) {
      cursor = cursor.where("location").near({
        center: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        maxDistance: 50000, // 50 km
        spherical: true,
      });
    }

    const posts = await cursor
      .sort({ createdAt: -1 })
      .populate("user", "name")
      .populate("pledgedBy", "name");

    res.json(posts);
  } catch (err) {
    console.error("getPosts error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/** GET /api/posts/:id */
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "name")
      .populate("pledgedBy", "name");

    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("getPostById error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/** PUT /api/posts/:id */
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "User not authorized" });
    }

    const { title, description, category, urgency, image, location } = req.body;

    if (title !== undefined) post.title = title;
    if (description !== undefined) post.description = description;
    if (category !== undefined) post.category = category;
    if (urgency !== undefined) post.urgency = urgency;
    if (image !== undefined) post.image = image;

    // ✅ update location safely
    if (location) {
      if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        post.location = { type: "Point", coordinates: location.coordinates };
      } else if (typeof location.lat === "number" && typeof location.lng === "number") {
        post.location = { type: "Point", coordinates: [location.lng, location.lat] };
      }
    }

    const saved = await post.save();
    const populated = await saved.populate([
      { path: "user", select: "name" },
      { path: "pledgedBy", select: "name" },
    ]);
    res.json(populated);
  } catch (err) {
    console.error("updatePost error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/** DELETE /api/posts/:id */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "User not authorized" });
    }

    await post.deleteOne();
    res.json({ message: "Post removed" });
  } catch (err) {
    console.error("deletePost error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/** PUT /api/posts/:id/vote */
export const voteOnPost = async (req, res) => {
  try {
    const { voteType } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const uid = req.user._id.toString();
    post.upvotes = post.upvotes.filter((id) => id.toString() !== uid);
    post.downvotes = post.downvotes.filter((id) => id.toString() !== uid);

    if (voteType === "up") post.upvotes.push(req.user._id);
    if (voteType === "down") post.downvotes.push(req.user._id);

    const saved = await post.save();
    const populated = await saved.populate([
      { path: "user", select: "name" },
      { path: "pledgedBy", select: "name" },
    ]);
    res.json(populated);
  } catch (err) {
    console.error("voteOnPost error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/** PUT /api/posts/:id/pledge (toggle) */
export const pledgeToPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const uid = req.user._id.toString();
    const hasPledged = post.pledgedBy.some((id) => id.toString() === uid);

    if (hasPledged) {
      post.pledgedBy = post.pledgedBy.filter((id) => id.toString() !== uid);
    } else {
      post.pledgedBy.push(req.user._id);
    }

    const saved = await post.save();
    const populated = await saved.populate([
      { path: "user", select: "name" },
      { path: "pledgedBy", select: "name" },
    ]);
    res.json(populated);
  } catch (err) {
    console.error("pledgeToPost error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/** PUT /api/posts/:id/status */
export const updatePostStatus = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "User not authorized" });
    }

    post.status = req.body.status || post.status;

    const saved = await post.save();
    const populated = await saved.populate([
      { path: "user", select: "name" },
      { path: "pledgedBy", select: "name" },
    ]);
    res.json(populated);
  } catch (err) {
    console.error("updatePostStatus error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/** POST /api/posts/:id/view */
export const addView = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const uid = req.user._id.toString();
    if (!post.views.some((id) => id.toString() === uid)) {
      post.views.push(req.user._id);
      post.viewCount = post.views.length;
      await post.save();
    }

    res.json({ viewCount: post.viewCount });
  } catch (err) {
    console.error("addView error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

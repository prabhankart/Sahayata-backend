import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Post from '../models/Post.js';
import jwt from 'jsonwebtoken';

// @desc    Register a new user
// @route   POST /api/users/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
export const getTopHelpers = async (req, res) => {
  try {
    // This is a more advanced MongoDB aggregation pipeline.
    // It counts how many times each user appears in the 'pledgedBy' array of all posts.
    const topHelpers = await Post.aggregate([
      { $unwind: '$pledgedBy' },
      { $group: { _id: '$pledgedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: '$userDetails._id',
          name: '$userDetails.name',
          pledgeCount: '$count'
        }
      }
    ]);

    res.json(topHelpers);
  } catch (error) {
    console.error('Error fetching top helpers:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
export const getAllUsers = async (req, res) => {
  try {
    // Find all users, but only return their name and creation date
    const users = await User.find({}).select('name createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
// ... at the end of the file

// @desc    Update user profile (e.g., location)
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
       user.name = req.body.name || user.name;
      user.location = req.body.location || user.location;
      user.bio = req.body.bio || user.bio;
      user.skills = req.body.skills || user.skills;
      user.availability = req.body.availability || user.availability;

      const updatedUser = await user.save();

      // Also generate a new token with potentially updated info
      const token = jwt.sign({ id: updatedUser._id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        location: updatedUser.location,
        token, // Send back the token so the frontend can stay in sync
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -email');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
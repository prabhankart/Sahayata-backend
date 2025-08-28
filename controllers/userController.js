import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Post from '../models/Post.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const hashed = password ? await bcrypt.hash(password, 10) : undefined;
    const user = await User.create({ name, email, password: hashed, avatar: avatar || '' });
    const token = signToken(user._id);
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, avatar: user.avatar, token });
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const ok = user && user.password && (await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken(user._id);
    res.json({ _id: user._id, name: user.name, email: user.email, avatar: user.avatar, token });
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getTopHelpers = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const items = await User.find({ numReviews: { $gt: 0 } })
      .sort({ averageRating: -1, numReviews: -1, createdAt: 1 })
      .limit(limit)
      .select('name avatar averageRating numReviews skills');
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { q, skill, minRating } = req.query;
    const filter = {};
    if (q) filter.$text = { $search: String(q).slice(0, 100) };
    if (skill) filter.skills = { $in: [skill] };
    if (minRating) filter.averageRating = { $gte: parseFloat(minRating) || 0 };

    const users = await User.find(filter).select('name avatar skills averageRating numReviews');
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, avatar, bio, location, skills, availability } = req.body;
    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (skills !== undefined) user.skills = skills;
    if (availability !== undefined) user.availability = availability;

    await user.save();
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

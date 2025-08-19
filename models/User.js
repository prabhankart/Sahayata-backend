import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Password is no longer required
  googleId: { type: String }, // To store the user's Google ID
  location: { type: String, default: '' },
avatar: { type: String, default: '' },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User; 
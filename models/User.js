import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Password is no longer required
  googleId: { type: String }, // To store the user's Google ID
  location: { type: String, default: '' },
avatar: { type: String, default: '' },
bio: { type: String, default: '', maxLength: 200 },
skills: { type: [String], default: [] },
availability: {
    weekdayMornings: { type: Boolean, default: false },
    weekdayAfternoons: { type: Boolean, default: false },
    weekdayEvenings: { type: Boolean, default: false },
    weekends: { type: Boolean, default: false },
},
averageRating: { type: Number, default: 0 },
numReviews: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User; 
import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  // Link the post to the user who created it
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // This creates a relationship with the User model
  },
  title: {
    type: String,
    required: true,
  },
  category: {
  type: String,
  required: true,
  enum: ['Home & Repair', 'Tutoring & Learning', 'Tech Support', 'Errands & Shopping', 'Health & Wellness', 'Other'],
},
urgency: {
  type: String,
  required: true,
  enum: ['Low', 'Medium', 'High'],
  default: 'Medium',
},
  description: {
    type: String,
    required: true,
  },
  // ... inside postSchema
  // ... inside postSchema
// ... after description field
image: {
  type: String, // We'll store the image URL here
},
location: {
  type: {
    type: String,
    enum: ['Point'], // 'location.type' must be 'Point'
  },
  coordinates: {
    type: [Number], // Array of numbers for [longitude, latitude]
  },
},

pledgedBy: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
}],
upvotes: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
}],
downvotes: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
}],
status: {
// ... rest of the schema
    type: String,
    required: true,
    enum: ['Open', 'In Progress', 'Resolved'], // The status can only be one of these values
    default: 'Open',
  },
  // We will add image and location functionality later
}, {
  timestamps: true,
});
// ... after const postSchema = new mongoose.Schema({ ... });

postSchema.index({ location: '2dsphere' }); // Create a geospatial index

// ...

const Post = mongoose.model('Post', postSchema);

export default Post;
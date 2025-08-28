import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: [arr => arr.length === 2, 'Conversation needs exactly 2 participants']
  }],
  participantsKey: { type: String, unique: true }, // "a:b"
}, { timestamps: true });

conversationSchema.pre('validate', function (next) {
  if (Array.isArray(this.participants) && this.participants.length === 2) {
    const [a, b] = this.participants.map(String).sort();
    this.participantsKey = `${a}:${b}`;
  }
  next();
});

conversationSchema.index({ updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);

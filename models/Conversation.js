import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    // stable key like "a:b" for fast lookup / upsert
    participantsKey: { type: String, unique: true },
  },
  { timestamps: true }
);

// Enforce exactly 2 participants
conversationSchema.path('participants').validate(function (arr) {
  return Array.isArray(arr) && arr.length === 2;
}, 'Conversation needs exactly 2 participants');

// Keep participantsKey in sync
conversationSchema.pre('validate', function (next) {
  if (Array.isArray(this.participants) && this.participants.length === 2) {
    const [a, b] = this.participants.map(String).sort();
    this.participantsKey = `${a}:${b}`;
  }
  next();
});

conversationSchema.index({ updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);

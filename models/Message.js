import mongoose from "mongoose";
import Conversation from "./Conversation.js"; // used to bump updatedAt after saves

const reactionSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: String,
    type: {
      type: String,
      enum: ["image", "video", "audio", "file", "post"],
      default: "file",
      required: true,
    },
    name: String,
    mime: String,
    size: Number,
    postRef: {
      _id:        { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
      title:      String,
      status:     String,
      authorName: String,
      coverUrl:   String,
      slug:       String,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    post:         { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    text: { type: String, default: "" },

    attachments: { type: [attachmentSchema], default: [] },

    clientId: String, // optimistic dedupe
    reactions: [reactionSchema],
    edited: { type: Boolean, default: false },

    // delete tracking
    deletedFor:         { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
    deletedForEveryone: { type: Boolean, default: false },

    // NEW: read tracking for unread badges
    readBy: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [], index: true },
  },
  { timestamps: true }
);

// Require at least text or one attachment
messageSchema.pre("validate", function (next) {
  if (!this.text?.trim() && (!this.attachments || this.attachments.length === 0)) {
    return next(new Error("Message must include text or attachments."));
  }
  next();
});

// NEW: on create, mark the sender as having read the message
messageSchema.pre("save", function (next) {
  if (this.isNew && this.sender) {
    const sid = this.sender.toString();
    if (!this.readBy.some(id => String(id) === sid)) {
      this.readBy.push(this.sender);
    }
  }
  next();
});

// NEW: after save, bump the conversation's updatedAt so list sorts correctly
messageSchema.post("save", async function (doc) {
  try {
    if (doc.conversation) {
      await Conversation.updateOne(
        { _id: doc.conversation },
        { $set: { updatedAt: new Date() } }
      );
    }
  } catch (e) {
    // don't throw from post hook
  }
});

// Indexes for fast unread queries
messageSchema.index({ post: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, readBy: 1 }); // unread calc
messageSchema.index({ conversation: 1, sender: 1 }); // unread calc

export default mongoose.model("Message", messageSchema);

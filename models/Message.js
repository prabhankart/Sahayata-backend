import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    // For image/video/audio/file or linked post preview
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

    // For type === "post" (optional rich preview)
    postRef: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
      title: String,
      status: String,
      authorName: String,
      coverUrl: String,
      slug: String,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    // Either a project/post room or a private DM
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    text: { type: String, default: "" },

    attachments: { type: [attachmentSchema], default: [] },

    clientId: String, // optimistic dedupe
    reactions: [reactionSchema],
    edited: { type: Boolean, default: false },

    // delete tracking
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // “delete for me”
    deletedForEveryone: { type: Boolean, default: false },              // “delete for everyone”
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

messageSchema.index({ post: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);

import mongoose from "mongoose";

const groupAttachmentSchema = new mongoose.Schema(
  {
    url: String, // optional (not present for type "post")
    type: {
      type: String,
      enum: ["image", "file", "video", "audio", "post"],
      default: "file",
      required: true,
    },
    name: String,
    size: Number,
    mime: String,
    // only for type === "post"
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

const groupMessageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, default: "" },
    clientId: { type: String, index: true },

    // replies
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "GroupMessage", default: null },

    // attachments (images/files/video/audio/post)
    attachments: { type: [groupAttachmentSchema], default: [] },
  },
  { timestamps: true }
);

// Require at least text or one attachment
groupMessageSchema.pre("validate", function (next) {
  if (!this.text?.trim() && (!this.attachments || this.attachments.length === 0)) {
    return next(new Error("Message must include text or attachments."));
  }
  next();
});

groupMessageSchema.index({ group: 1, createdAt: 1 });
groupMessageSchema.index({ clientId: 1 });

export default mongoose.model("GroupMessage", groupMessageSchema);

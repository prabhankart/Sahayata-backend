// models/GroupMessage.js
import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    // image | video | audio | file | post
    type: { type: String, required: true },

    // for media/files
    url: String,
    name: String,
    mime: String,
    size: Number,

    // for type === "post"
    postRef: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
      title: String,
      status: String,
      authorName: String,
      coverUrl: String,
    },
  },
  { _id: false }
);

const groupMessageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // STAGE0: allow attachments-only (text not required)
    text: { type: String, default: "" },

    attachments: [attachmentSchema],
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "GroupMessage", default: null },

    // STAGE0: client-side de-dupe
    clientId: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

groupMessageSchema.index({ group: 1, createdAt: -1 });
groupMessageSchema.index({ group: 1, clientId: 1 }, { unique: true, sparse: true });

export default mongoose.model("GroupMessage", groupMessageSchema);

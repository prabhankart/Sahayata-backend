// models/GroupMessage.js
import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true },
    clientId: { type: String, index: true },
    // ✨ reply support
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "GroupMessage", default: null },
    // for future images/files
    attachments: [
      {
        url: String,
        type: { type: String, enum: ["image", "file", "video"], default: "file" },
        name: String,
        size: Number,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("GroupMessage", groupMessageSchema);

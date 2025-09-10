// models/Group.js
import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: "text" },
    description: { type: String, default: "" },
    category: { type: String, default: "General", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

    // ✨ New fields
    problemTitle: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "On Hold"],
      default: "Open",
      index: true,
    },
    pledgedHelpers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // nice-to-have for listing
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

groupSchema.index({ name: "text", description: "text", category: "text" });

export default mongoose.model("Group", groupSchema);

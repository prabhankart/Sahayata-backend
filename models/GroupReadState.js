// models/GroupReadState.js
import mongoose from "mongoose";

const groupReadSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastReadAt: { type: Date, default: new Date(0) }, // epoch default
  },
  { timestamps: true }
);

// STAGE0 (Read state): unique per user/group
groupReadSchema.index({ group: 1, user: 1 }, { unique: true });

export default mongoose.model("GroupReadState", groupReadSchema);

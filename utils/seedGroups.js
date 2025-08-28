// utils/seedGroups.js
import Group from "../models/Group.js";

const defaultGroups = [
  {
    name: "Education Help",
    category: "Education",
    description: "Tutoring, study groups, exam prep, school resources.",
  },
  {
    name: "Health & Wellness",
    category: "Health",
    description: "Discuss fitness, mental health, medical support, wellness tips.",
  },
  {
    name: "Environment",
    category: "Environment",
    description: "Talk about sustainability, climate, cleanups, and eco-projects.",
  },
  {
    name: "Social Support",
    category: "Social",
    description: "Make friends, peer support, and community bonding.",
  },
  {
    name: "Tech & Coding",
    category: "Technology",
    description: "Programming help, tech questions, and learning new tools.",
  },
];

export default async function ensureTopicGroups() {
  try {
    const count = await Group.countDocuments();
    if (count === 0) {
      console.log("🌱 Seeding default topic groups...");
      await Group.insertMany(defaultGroups);
      console.log("✅ Default groups created!");
    } else {
      console.log("ℹ️ Groups already exist, skipping seeding.");
    }
  } catch (err) {
    console.error("❌ Error seeding groups:", err.message);
  }
}


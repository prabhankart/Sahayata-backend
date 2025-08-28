// utils/seedGroups.js
import Group from '../models/Group.js';

const DEFAULT_GROUPS = [
  {
    name: 'Education Help',
    category: 'Education',
    description: 'Tutoring, study groups, exam prep, school resources.',
  },
  {
    name: 'Health & Wellness',
    category: 'Health',
    description: 'First aid tips, mental health support, access to care.',
  },
  {
    name: 'Environment & Cleanups',
    category: 'Environment',
    description: 'Local cleanups, recycling drives, tree planting.',
  },
  {
    name: 'Food & Essentials',
    category: 'Social',
    description: 'Food banks, meal sharing, clothing and essentials.',
  },
  {
    name: 'Tech Support',
    category: 'Technology',
    description: 'Fix laptop/phone issues, software help, internet access.',
  },
  {
    name: 'Jobs & Opportunities',
    category: 'Careers',
    description: 'Job leads, resume help, interview practice.',
  },
];

export default async function ensureTopicGroups() {
  const count = await Group.countDocuments();
  if (count > 0) return;

  await Group.insertMany(
    DEFAULT_GROUPS.map((g) => ({
      ...g,
      // createdBy & members will be empty until users join
      members: [],
    }))
  );
  console.log('🌱 Seeded default topic groups');
}


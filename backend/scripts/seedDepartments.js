require('dotenv').config();
const { connectToDatabase } = require('../src/config/mongo');
const Department = require('../src/models/Department');

async function seed() {
  await connectToDatabase();
  const items = [
    'Computer Science & Engineering',
    'Electronics and Communication Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Information Science & Engineering',
  ];
  for (const name of items) {
    await Department.updateOne({ name }, { $set: { name, isActive: true } }, { upsert: true });
  }
  console.log('✅ Departments seeded');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });








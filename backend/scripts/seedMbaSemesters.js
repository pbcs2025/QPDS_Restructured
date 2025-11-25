const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MbaSemester = require('../src/models/MbaSemester');

async function seedMbaSemesters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // MBA typically has 4 semesters (2 years program)
    const semesters = [
      { semesterNumber: 1, name: 'Semester 1', isActive: true },
      { semesterNumber: 2, name: 'Semester 2', isActive: true },
      { semesterNumber: 3, name: 'Semester 3', isActive: true },
      { semesterNumber: 4, name: 'Semester 4', isActive: true }
    ];

    console.log('Seeding MBA semesters...\n');

    for (const sem of semesters) {
      const existing = await MbaSemester.findOne({ semesterNumber: sem.semesterNumber });
      
      if (existing) {
        console.log(`⚠️  Semester ${sem.semesterNumber} already exists, skipping...`);
      } else {
        await MbaSemester.create(sem);
        console.log(`✅ Created: ${sem.name}`);
      }
    }

    console.log('\n✅ MBA semesters seeded successfully!');
    console.log('\nYou can now see the "mbasemesters" collection in MongoDB Compass.');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedMbaSemesters();

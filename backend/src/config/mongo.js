const mongoose = require('mongoose');
const Department = require('../models/Department');
const College = require('../models/College');

async function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI;

    try {
      await mongoose.connect(mongoUri, {
        dbName: 'GAT_QPDS', // ensure correct database
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
  
      console.log('✅ MongoDB connected successfully');

    // Seed departments if empty
    const deptCount = await Department.countDocuments();
    if (deptCount === 0) {
      const departments = [
        { name: 'Computer Science and Engineering (CSE)', isActive: true },
        { name: 'Electronics and Communication Engineering (ECE)', isActive: true },
        { name: 'Electrical and Electronics Engineering (EEE)', isActive: true },
        { name: 'Mechanical Engineering (ME)', isActive: true },
        { name: 'Civil Engineering (CE)', isActive: true },
        { name: 'Information Science and Engineering (ISE)', isActive: true },
      ];
      await Department.insertMany(departments);
      console.log('✅ Seeded default departments');
    }

    // Seed colleges if empty
    const collegeCount = await College.countDocuments();
    if (collegeCount === 0) {
      const colleges = [
        { name: 'Global Academy of Technology', isActive: true },
        { name: 'RNS Institute of Technology', isActive: true },
        { name: 'Dayananda Sagar College of Engineering', isActive: true },
        { name: 'Jawaharlal Nehru National College of Engineering', isActive: true },
        { name: 'Siddaganga Institute of Technology', isActive: true },
        { name: 'Bapuji Institute of Engineering & Technology', isActive: true },
        { name: 'KLE Institute of Technology', isActive: true },
        { name: 'BMS College of Engineering', isActive: true },
        { name: 'RV College of Engineering', isActive: true },
        { name: 'PES University', isActive: true },
        { name: 'International Institute of Information Technology', isActive: true },
        { name: 'Manipal Institute of Technology', isActive: true },
        { name: 'NITK Surathkal', isActive: true },
        { name: 'Visvesvaraya Technological University', isActive: true },
        { name: 'Christ University', isActive: true },
      ];
      await College.insertMany(colleges);
      console.log('✅ Seeded default colleges');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = { connectToDatabase };

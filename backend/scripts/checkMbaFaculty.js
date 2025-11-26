const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Faculty = require('../src/models/Faculty');

async function checkMbaFaculty() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'tinay3k0508@gmail.com';

    // Check User collection
    const user = await User.findOne({ email }).lean();
    console.log('=== USER COLLECTION ===');
    if (user) {
      console.log('Found user:');
      console.log('  _id:', user._id);
      console.log('  name:', user.name);
      console.log('  username:', user.username);
      console.log('  email:', user.email);
      console.log('  password:', user.password);
      console.log('  role:', user.role);
      console.log('  usertype:', user.usertype);
      console.log('  deptName:', user.deptName);
    } else {
      console.log('❌ No user found with email:', email);
    }

    console.log('\n=== FACULTY COLLECTION ===');
    // Check Faculty collection
    const faculty = await Faculty.findOne({ email }).lean();
    if (faculty) {
      console.log('Found faculty:');
      console.log('  _id:', faculty._id);
      console.log('  facultyId:', faculty.facultyId);
      console.log('  name:', faculty.name);
      console.log('  email:', faculty.email);
      console.log('  passwordHash:', faculty.passwordHash);
      console.log('  department:', faculty.department);
      console.log('  role:', faculty.role);
      console.log('  isActive:', faculty.isActive);
    } else {
      console.log('❌ No faculty found with email:', email);
    }

    console.log('\n=== VERIFICATION ===');
    if (user && faculty) {
      if (user._id.toString() === faculty.facultyId.toString()) {
        console.log('✅ facultyId reference is correct');
      } else {
        console.log('❌ facultyId mismatch!');
        console.log('  User _id:', user._id);
        console.log('  Faculty.facultyId:', faculty.facultyId);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkMbaFaculty();

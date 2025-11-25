const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Faculty = require('../src/models/Faculty');

async function updateMbaFaculty() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'tinay3k0508@gmail.com';

    // Update User record
    const userUpdate = await User.findOneAndUpdate(
      { email },
      {
        name: 'Tina',
        password: 'tina123',
        deptName: 'MBA'
      },
      { new: true }
    );

    if (userUpdate) {
      console.log('✅ Updated User record:');
      console.log('  name:', userUpdate.name);
      console.log('  password:', userUpdate.password);
      console.log('  deptName:', userUpdate.deptName);
    } else {
      console.log('❌ User not found');
    }

    // Update Faculty record
    const facultyUpdate = await Faculty.findOneAndUpdate(
      { email },
      {
        name: 'Tina',
        passwordHash: 'tina123',
        department: 'MBA'
      },
      { new: true }
    );

    if (facultyUpdate) {
      console.log('\n✅ Updated Faculty record:');
      console.log('  name:', facultyUpdate.name);
      console.log('  passwordHash:', facultyUpdate.passwordHash);
      console.log('  department:', facultyUpdate.department);
    } else {
      console.log('❌ Faculty not found');
    }

    console.log('\n✅ MBA Faculty updated successfully!');
    console.log('Login credentials:');
    console.log('  Email: tinay3k0508@gmail.com');
    console.log('  Password: tina123');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateMbaFaculty();

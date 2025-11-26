const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Faculty = require('../src/models/Faculty');

async function addMbaFaculty() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'tinay3k0508@gmail.com' });
    if (existingUser) {
      console.log('⚠️ User already exists with email tinay3k0508@gmail.com');
      console.log('User ID:', existingUser._id);
      
      // Check if faculty record exists
      const existingFaculty = await Faculty.findOne({ email: 'tinay3k0508@gmail.com' });
      if (existingFaculty) {
        console.log('✅ Faculty record already exists');
        console.log('Faculty ID:', existingFaculty._id);
        
        // Update facultyId if needed
        if (existingFaculty.facultyId.toString() !== existingUser._id.toString()) {
          await Faculty.updateOne(
            { email: 'tinay3k0508@gmail.com' },
            { facultyId: existingUser._id }
          );
          console.log('✅ Updated facultyId reference');
        }
      } else {
        // Create faculty record
        const faculty = await Faculty.create({
          facultyId: existingUser._id,
          name: 'Tina',
          email: 'tinay3k0508@gmail.com',
          passwordHash: 'tina123',
          department: 'MBA',
          clgName: 'Global Academy of Technology',
          contactNumber: '9876501234',
          type: 'internal',
          role: 'faculty',
          isActive: true
        });
        console.log('✅ Created faculty record:', faculty._id);
      }
      
      await mongoose.disconnect();
      return;
    }

    // Create User record
    const user = await User.create({
      name: 'Tina',
      username: 'tinay3k0508@gmail.com',
      clgName: 'Global Academy of Technology',
      deptName: 'MBA',
      email: 'tinay3k0508@gmail.com',
      phoneNo: '9876501234',
      password: 'tina123',
      usertype: 'internal',
      role: 'Faculty'
    });
    console.log('✅ Created User record:', user._id);

    // Create Faculty record
    const faculty = await Faculty.create({
      facultyId: user._id,
      name: 'Tina',
      email: 'tinay3k0508@gmail.com',
      passwordHash: 'tina123',
      department: 'MBA',
      clgName: 'Global Academy of Technology',
      contactNumber: '9876501234',
      type: 'internal',
      role: 'faculty',
      isActive: true
    });
    console.log('✅ Created Faculty record:', faculty._id);

    console.log('\n✅ MBA Faculty added successfully!');
    console.log('Login credentials:');
    console.log('  Email: tinay3k0508@gmail.com');
    console.log('  Password: tina123');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

addMbaFaculty();

/* eslint-disable no-console */
require('dotenv').config();
const { connectToDatabase } = require('../src/config/mongo');
const User = require('../src/models/User');

async function main() {
  await connectToDatabase();

  const superAdminUsername = 'superadmin';
  const superAdminPassword = '12345';
  const superAdminEmail = 'superadmin@gat.ac.in';

  // Check if superadmin with exact username already exists (case-insensitive)
  const existing = await User.findOne({ 
    username: { $regex: new RegExp(`^${superAdminUsername}$`, 'i') }
  });

  if (existing) {
    // Update existing user to ensure correct username (lowercase), password and role
    existing.username = superAdminUsername.toLowerCase(); // Force lowercase
    existing.password = superAdminPassword;
    existing.role = 'SuperAdmin';
    existing.usertype = 'superadmin';
    existing.name = 'Super Admin';
    existing.clgName = existing.clgName || 'Global Academy of Technology';
    existing.deptName = existing.deptName || 'Administration';
    existing.email = existing.email || superAdminEmail;
    await existing.save();
    
    console.log('✅ SuperAdmin user updated successfully!');
    console.log(`   Username: ${existing.username}`);
    console.log(`   Password: ${existing.password}`);
    console.log(`   Email: ${existing.email}`);
    console.log(`   Role: ${existing.role}`);
    process.exit(0);
  }

  // Check if any SuperAdmin exists (might have different username)
  const anySuperAdmin = await User.findOne({ role: 'SuperAdmin' }).lean();
  if (anySuperAdmin) {
    console.log('⚠️  A SuperAdmin user exists with different username:');
    console.log(`   Username: ${anySuperAdmin.username}`);
    console.log(`   Email: ${anySuperAdmin.email}`);
    console.log('\n💡 Creating new superadmin user with username "superadmin"...');
  }

  // Create superadmin user
  try {
    const user = await User.create({
      name: 'Super Admin',
      username: superAdminUsername.toLowerCase(), // Ensure lowercase
      clgName: 'Global Academy of Technology',
      deptName: 'Administration',
      email: superAdminEmail,
      phoneNo: '',
      password: superAdminPassword,
      usertype: 'superadmin',
      role: 'SuperAdmin',
    });

    console.log('✅ SuperAdmin user created successfully!');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${user.password}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
  } catch (error) {
    if (error.code === 11000) {
      console.error('❌ Error: Username or email already exists');
      console.error('   Try updating the existing user manually or use a different email.');
    } else {
      console.error('❌ Error creating SuperAdmin:', error.message);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});


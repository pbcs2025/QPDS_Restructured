const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const Faculty = require('../src/models/Faculty');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://prathibhabcs:globalacademyoftechnology@clusterqpds.6ybfzvb.mongodb.net/GAT_QPDS';
    await mongoose.connect(mongoUri, {
      dbName: 'GAT_QPDS',
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const migrateFacultyUsers = async () => {
  try {
    console.log('🔄 Starting faculty migration...');

    // Find all users with role 'Faculty'
    const facultyUsers = await User.find({ 
      $or: [
        { role: 'Faculty' },
        { usertype: 'internal' } // Assuming internal users are faculty
      ]
    });

    console.log(`📊 Found ${facultyUsers.length} faculty users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of facultyUsers) {
      try {
        // Check if faculty record already exists
        const existingFaculty = await Faculty.findOne({ facultyId: user._id });
        
        if (existingFaculty) {
          console.log(`⏭️  Skipping ${user.email} - already exists in faculties collection`);
          skippedCount++;
          continue;
        }

        // Create new faculty record
        const facultyData = {
          facultyId: user._id,
          name: user.name,
          email: user.email,
          passwordHash: user.password, // In production, ensure this is properly hashed
          department: user.deptName || user.department || 'Not Specified',
          clgName: user.clgName,
          contactNumber: user.phoneNo,
          type: user.usertype || 'internal', // Set type based on usertype
          role: 'faculty',
          isActive: true
        };

        await Faculty.create(facultyData);
        
        // Update user role to ensure consistency
        await User.findByIdAndUpdate(user._id, { 
          role: 'Faculty',
          usertype: 'internal'
        });

        console.log(`✅ Migrated: ${user.email} -> ${user.name}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} faculty records`);
    console.log(`⏭️  Skipped existing: ${skippedCount} faculty records`);
    console.log(`📊 Total processed: ${facultyUsers.length} users`);

    // Verify migration
    const totalFaculties = await Faculty.countDocuments();
    console.log(`🔍 Total faculties in collection: ${totalFaculties}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

const main = async () => {
  await connectDB();
  await migrateFacultyUsers();
  
  console.log('🏁 Migration completed. Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
};

// Run migration
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateFacultyUsers };

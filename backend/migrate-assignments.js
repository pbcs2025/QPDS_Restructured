const mongoose = require('mongoose');
const Assignment = require('./src/models/Assignment');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qpds', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration function
const migrateAssignments = async () => {
  try {
    console.log('🔄 Starting migration...');
    
    // Find assignments without semester field
    const assignmentsWithoutSemester = await Assignment.find({ 
      semester: { $exists: false } 
    });
    
    console.log(`📊 Found ${assignmentsWithoutSemester.length} assignments without semester`);
    
    if (assignmentsWithoutSemester.length > 0) {
      // Update all assignments without semester to have semester = 1
      const result = await Assignment.updateMany(
        { semester: { $exists: false } },
        { $set: { semester: 1 } }
      );
      
      console.log(`✅ Migration completed: Updated ${result.modifiedCount} assignments`);
    } else {
      console.log('✅ No assignments need migration');
    }
    
    // Verify the migration
    const remainingWithoutSemester = await Assignment.find({ 
      semester: { $exists: false } 
    });
    
    console.log(`🔍 Verification: ${remainingWithoutSemester.length} assignments still without semester`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await migrateAssignments();
};

runMigration();

const mongoose = require('mongoose');
require('dotenv').config();
const Faculty = require('../src/models/Faculty');

async function fixFacultyTypes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qpds', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all faculty records with missing or invalid type
    const invalidFaculties = await Faculty.find({
      $or: [
        { type: { $exists: false } },
        { type: null },
        { type: { $nin: ['internal', 'external'] } }
      ]
    });

    console.log(`Found ${invalidFaculties.length} faculty records with invalid/missing type`);

    // Update each invalid record
    let updatedCount = 0;
    for (const faculty of invalidFaculties) {
      try {
        faculty.type = 'internal'; // Set default type
        await faculty.save();
        updatedCount++;
        console.log(`Updated faculty ${faculty._id} (${faculty.email}) - set type to 'internal'`);
      } catch (err) {
        console.error(`Error updating faculty ${faculty._id}:`, err.message);
      }
    }

    console.log(`\nSuccessfully updated ${updatedCount} faculty records`);
    console.log('Data cleanup complete');

  } catch (err) {
    console.error('Error during data cleanup:', err);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run the script
fixFacultyTypes();

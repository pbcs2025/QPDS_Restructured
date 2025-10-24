const mongoose = require('mongoose');
const Department = require('../src/models/Department');

// Color mapping for existing departments
const colorMap = {
  "Aerospace Engineering (AE)": "#ff8c00", // orange
  "Artificial Intelligence and Machine Learning (AIML)": "#dc3545", // red
  "Basic Science": "#87ceeb", // sky blue
  "Biotechnology Engineering (BT)": "#ffc0cb", // pink
  "Civil Engineering (CE)": "#808080", // grey
  "Computer Science & Engineering AIDS (CSE-AIDS)": "#ffa500", // light orange
  "Computer Science & Engineering AIML (CSE-AIML)": "#d2691e", // light chocolate
  "Computer Science and Engineering (CSE)": "#8b4513", // chocolate
  "Electrical and Electronics Engineering (EEE)": "#90ee90", // light green
  "Electronics and Communication Engineering (ECE)": "#006400", // dark green
  "Electronics and Instrumentation Engineering (EIE)": "#008000", // green
  "Mechanical Engineering (ME)": "#800080", // purple
};

async function updateDepartmentColors() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qpds');
    
    console.log('Connected to MongoDB');
    
    // Get all departments
    const departments = await Department.find({});
    console.log(`Found ${departments.length} departments`);
    
    let updatedCount = 0;
    
    for (const dept of departments) {
      const color = colorMap[dept.name];
      if (color && (!dept.color || dept.color === '#6c757d')) {
        await Department.findByIdAndUpdate(dept._id, { color });
        console.log(`Updated ${dept.name} with color ${color}`);
        updatedCount++;
      } else if (!color) {
        console.log(`No color mapping found for ${dept.name}, keeping existing color: ${dept.color || '#6c757d'}`);
      } else {
        console.log(`${dept.name} already has color ${dept.color}, skipping`);
      }
    }
    
    console.log(`\nUpdate complete! Updated ${updatedCount} departments.`);
    
  } catch (error) {
    console.error('Error updating department colors:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
updateDepartmentColors();

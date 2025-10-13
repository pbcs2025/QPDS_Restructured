const mongoose = require('mongoose');
const QuestionPaper = require('./src/models/QuestionPaper');

async function debugPapers() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/GAT_QPDS', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🔍 Debugging Question Papers...\n');

    // Get all papers
    const allPapers = await QuestionPaper.find({}).lean();
    console.log('Total papers in database:', allPapers.length);

    // Get papers with department field
    const papersWithDept = await QuestionPaper.find({ department: { $exists: true, $ne: '' } }).lean();
    console.log('Papers with department field:', papersWithDept.length);

    // Get papers without department field
    const papersWithoutDept = await QuestionPaper.find({ 
      $or: [
        { department: { $exists: false } },
        { department: '' },
        { department: null }
      ]
    }).lean();
    console.log('Papers without department field:', papersWithoutDept.length);

    // Show sample papers
    console.log('\n📋 Sample papers:');
    allPapers.slice(0, 5).forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.subject_code} - ${paper.subject_name} (Dept: ${paper.department || 'N/A'})`);
    });

    // Check for the test paper we just created
    const testPapers = await QuestionPaper.find({ subject_code: 'TEST001' }).lean();
    console.log('\n🧪 Test papers found:', testPapers.length);
    testPapers.forEach(paper => {
      console.log(`- ${paper.subject_code} - ${paper.subject_name} (Dept: ${paper.department || 'N/A'})`);
    });

    // Check what departments exist
    const departments = await QuestionPaper.distinct('department');
    console.log('\n🏢 Departments in papers:', departments);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

debugPapers();

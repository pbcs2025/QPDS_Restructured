const mongoose = require('mongoose');
const QuestionPaper = require('./src/models/QuestionPaper');

async function testDirectDB() {
  try {
    // Connect to MongoDB using the same connection as the backend
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/GAT_QPDS';
    await mongoose.connect(mongoUri, {
      dbName: 'GAT_QPDS',
    });

    console.log('🔍 Testing Direct Database Access...\n');

    // Get the latest test paper
    const testPaper = await QuestionPaper.findOne({ subject_code: 'TEST002', question_number: '1c' }).lean();
    
    if (testPaper) {
      console.log('✅ Test paper found in database:');
      console.log('Full document:', JSON.stringify(testPaper, null, 2));
      
      // Check if department field exists
      console.log('\n📋 Field Analysis:');
      console.log('- department:', testPaper.department || 'undefined');
      console.log('- co:', testPaper.co || 'undefined');
      console.log('- level:', testPaper.level || 'undefined');
      console.log('- marks:', testPaper.marks || 'undefined');
    } else {
      console.log('❌ Test paper not found in database');
    }

    // Check the schema
    console.log('\n🏗️ Schema Analysis:');
    const schema = QuestionPaper.schema.obj;
    console.log('Available fields:', Object.keys(schema));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testDirectDB();

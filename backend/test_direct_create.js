const mongoose = require('mongoose');
const QuestionPaper = require('./src/models/QuestionPaper');

async function testDirectCreate() {
  try {
    // Connect to MongoDB using the same connection as the backend
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/GAT_QPDS';
    await mongoose.connect(mongoUri, {
      dbName: 'GAT_QPDS',
    });

    console.log('🔍 Testing Direct Database Creation...\n');

    // Try to create a document directly
    const testDoc = {
      subject_code: 'TEST004',
      subject_name: 'Test Subject 4',
      semester: 4,
      set_name: 'Set1',
      question_number: '1f',
      question_text: 'What is the capital of Spain?',
      co: 'CO1',
      level: 'L1',
      marks: 5,
      department: 'Computer Science and Engineering'
    };

    console.log('Creating document:', testDoc);
    
    const doc = await QuestionPaper.create(testDoc);
    console.log('✅ Document created successfully:', doc._id);
    
    // Check what was actually saved
    const saved = await QuestionPaper.findById(doc._id).lean();
    console.log('📋 Saved document:');
    console.log(JSON.stringify(saved, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testDirectCreate();

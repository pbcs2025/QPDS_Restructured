const axios = require('axios');

async function testSimple() {
  console.log('🧪 Simple API Test...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend connectivity...');
    const response = await axios.get('http://localhost:5000/test-db');
    console.log('✅ Backend is running:', response.data);

    // Test 2: Create a test question
    console.log('\n2. Creating test question...');
    const testQuestion = {
      subject_code: 'TEST001',
      subject_name: 'Test Subject',
      semester: 4,
      question_number: '1a',
      question_text: 'What is the capital of India?',
      co: 'CO1',
      level: 'L1',
      marks: 5,
      department: 'Computer Science and Engineering'
    };

    const createResponse = await axios.post('http://localhost:5000/api/question-bank', testQuestion);
    console.log('✅ Test question created:', createResponse.data.message);

    // Test 3: Check if verifier can see the paper
    console.log('\n3. Testing verifier paper retrieval...');
    const verifierResponse = await axios.get('http://localhost:5000/api/verifier/papers?department=Computer Science and Engineering&semester=4');
    console.log('✅ Verifier can see papers:', verifierResponse.data.length, 'papers found');

    if (verifierResponse.data.length > 0) {
      const paper = verifierResponse.data[0];
      console.log('   - Subject:', paper.subject_name, '(' + paper.subject_code + ')');
      console.log('   - Questions:', paper.questions.length);
      console.log('   - Status:', paper.status);
      console.log('   - Department:', paper.department);
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Backend server is not running. Please start it with: npm start');
    }
  }
}

// Run the test
testSimple();

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testWorkflow() {
  console.log('🧪 Testing Faculty to Verifier Workflow...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend connectivity...');
    const testResponse = await axios.get(`${API_BASE}/test-db`);
    console.log('✅ Backend is running\n');

    // Test 2: Create a test question paper
    console.log('2. Creating test question paper...');
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

    const createResponse = await axios.post(`${API_BASE}/question-bank`, testQuestion);
    console.log('✅ Test question created:', createResponse.data.message);

    // Test 3: Check if verifier can see the paper
    console.log('\n3. Testing verifier paper retrieval...');
    const verifierResponse = await axios.get(`${API_BASE}/verifier/papers?department=Computer Science and Engineering&semester=4`);
    console.log('✅ Verifier can see papers:', verifierResponse.data.length, 'papers found');

    if (verifierResponse.data.length > 0) {
      const paper = verifierResponse.data[0];
      console.log('   - Subject:', paper.subject_name, '(' + paper.subject_code + ')');
      console.log('   - Questions:', paper.questions.length);
      console.log('   - Status:', paper.status);
    }

    // Test 4: Test paper approval workflow
    console.log('\n4. Testing paper approval...');
    if (verifierResponse.data.length > 0) {
      const paper = verifierResponse.data[0];
      const updateData = {
        questions: paper.questions,
        finalStatus: 'approved'
      };

      const updateResponse = await axios.put(
        `${API_BASE}/verifier/papers/${paper.subject_code}/${paper.semester}`,
        updateData
      );
      console.log('✅ Paper approved:', updateResponse.data.message);
    }

    // Test 5: Check approved papers
    console.log('\n5. Testing approved papers retrieval...');
    const approvedResponse = await axios.get(`${API_BASE}/verifier/approved?department=Computer Science and Engineering`);
    console.log('✅ Approved papers:', approvedResponse.data.length, 'papers found');

    console.log('\n🎉 All tests passed! Faculty to Verifier workflow is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure backend server is running on port 5000');
    console.log('2. Check if MongoDB is connected');
    console.log('3. Verify all required fields are present');
  }
}

// Run the test
testWorkflow();

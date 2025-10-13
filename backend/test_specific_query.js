const axios = require('axios');

async function testSpecificQuery() {
  console.log('🧪 Testing Specific Query...\n');

  try {
    // Test 1: Create a question with all fields
    console.log('1. Creating test question...');
    const testQuestion = {
      subject_code: 'TEST006',
      subject_name: 'Test Subject 6',
      semester: 4,
      question_number: '1h',
      question_text: 'What is the capital of Japan?',
      co: 'CO1',
      level: 'L1',
      marks: 5,
      department: 'Computer Science and Engineering'
    };

    const createResponse = await axios.post('http://localhost:5000/api/question-bank', testQuestion);
    console.log('✅ Response:', createResponse.data);
    const questionId = createResponse.data.id;

    // Test 2: Try to get the specific question by ID (if there's an endpoint for that)
    console.log('\n2. Testing if we can get specific question...');
    
    // Since there's no direct endpoint, let's check if the verifier endpoint can see it
    console.log('\n3. Testing verifier endpoint with no filters...');
    const verifierResponse = await axios.get('http://localhost:5000/api/verifier/papers');
    console.log('✅ Verifier papers found:', verifierResponse.data.length);
    
    if (verifierResponse.data.length > 0) {
      const testPaper = verifierResponse.data.find(p => p.subject_code === 'TEST006');
      if (testPaper) {
        console.log('✅ Found our test paper in verifier endpoint:');
        console.log('   - Subject:', testPaper.subject_name);
        console.log('   - Department:', testPaper.department);
        console.log('   - CO:', testPaper.co);
        console.log('   - Level:', testPaper.level);
        console.log('   - Marks:', testPaper.marks);
        console.log('   - All fields:', Object.keys(testPaper));
      } else {
        console.log('❌ Test paper not found in verifier endpoint');
        console.log('Available papers:', verifierResponse.data.map(p => p.subject_code));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSpecificQuery();

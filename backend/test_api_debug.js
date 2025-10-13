const axios = require('axios');

async function testAPIDebug() {
  console.log('🧪 Testing API Debug...\n');

  try {
    // Test 1: Create a question with all fields
    console.log('1. Creating test question...');
    const testQuestion = {
      subject_code: 'TEST005',
      subject_name: 'Test Subject 5',
      semester: 4,
      question_number: '1j',
      question_text: 'What is the capital of Italy?',
      co: 'CO1',
      level: 'L1',
      marks: 5,
      department: 'Computer Science and Engineering'
    };

    console.log('Sending:', testQuestion);
    const createResponse = await axios.post('http://localhost:5000/api/question-bank', testQuestion);
    console.log('✅ Response:', createResponse.data);

    // Test 2: Get the question back and check all fields
    console.log('\n2. Retrieving the question...');
    const allPapersResponse = await axios.get('http://localhost:5000/api/question-bank');
    const testPaper = allPapersResponse.data.find(paper => paper.subject_code === 'TEST005');
    
    if (testPaper) {
      console.log('✅ Test paper retrieved:');
      console.log('   - Subject:', testPaper.subject_name);
      console.log('   - Department:', testPaper.department);
      console.log('   - CO:', testPaper.co);
      console.log('   - Level:', testPaper.level);
      console.log('   - Marks:', testPaper.marks);
      console.log('   - All fields:', Object.keys(testPaper));
    } else {
      console.log('❌ Test paper not found');
    }

    // Test 3: Check if verifier can see it
    console.log('\n3. Testing verifier access...');
    const verifierResponse = await axios.get('http://localhost:5000/api/verifier/papers?department=Computer Science and Engineering&semester=4');
    console.log('✅ Verifier papers found:', verifierResponse.data.length);
    
    if (verifierResponse.data.length > 0) {
      const paper = verifierResponse.data.find(p => p.subject_code === 'TEST005');
      if (paper) {
        console.log('✅ Verifier can see our test paper!');
        console.log('   - Subject:', paper.subject_name);
        console.log('   - Department:', paper.department);
      } else {
        console.log('❌ Verifier cannot see our test paper');
        console.log('Available papers:', verifierResponse.data.map(p => p.subject_code));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAPIDebug();

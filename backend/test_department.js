const axios = require('axios');

async function testDepartment() {
  console.log('🧪 Testing Department Field...\n');

  try {
    // Test 1: Create a question with department field
    console.log('1. Creating test question with department...');
    const testQuestion = {
      subject_code: 'TEST002',
      subject_name: 'Test Subject 2',
      semester: 4,
      question_number: '1c',
      question_text: 'What is the capital of France?',
      co: 'CO1',
      level: 'L1',
      marks: 5,
      department: 'Computer Science and Engineering'
    };

    console.log('Sending data:', testQuestion);
    const createResponse = await axios.post('http://localhost:5000/api/question-bank', testQuestion);
    console.log('✅ Test question created:', createResponse.data.message);

    // Test 2: Check if the question was saved with department
    console.log('\n2. Checking if department was saved...');
    const allPapersResponse = await axios.get('http://localhost:5000/api/question-bank');
    const testPaper = allPapersResponse.data.find(paper => paper.subject_code === 'TEST002');
    
    if (testPaper) {
      console.log('✅ Test paper found:');
      console.log('   - Subject:', testPaper.subject_name);
      console.log('   - Department:', testPaper.department || 'N/A');
      console.log('   - Full data:', JSON.stringify(testPaper, null, 2));
    } else {
      console.log('❌ Test paper not found');
    }

    // Test 3: Check verifier can see it
    console.log('\n3. Testing verifier can see the paper...');
    const verifierResponse = await axios.get('http://localhost:5000/api/verifier/papers?department=Computer Science and Engineering&semester=4');
    console.log('✅ Verifier papers found:', verifierResponse.data.length);
    
    if (verifierResponse.data.length > 0) {
      const paper = verifierResponse.data.find(p => p.subject_code === 'TEST002');
      if (paper) {
        console.log('✅ Verifier can see our test paper!');
        console.log('   - Subject:', paper.subject_name);
        console.log('   - Department:', paper.department);
      } else {
        console.log('❌ Verifier cannot see our test paper');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDepartment();

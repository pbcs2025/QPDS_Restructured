const axios = require('axios');
const FormData = require('form-data');

async function testFormData() {
  console.log('🧪 Testing FormData with Department...\n');

  try {
    // Create FormData like the frontend does
    const formData = new FormData();
    formData.append("subject_code", "TEST003");
    formData.append("subject_name", "Test Subject 3");
    formData.append("semester", "4");
    formData.append("question_number", "1e");
    formData.append("question_text", "What is the capital of Germany?");
    formData.append("co", "CO1");
    formData.append("level", "L1");
    formData.append("marks", "5");
    formData.append("department", "Computer Science and Engineering");

    console.log('Sending FormData with department field...');
    
    const response = await axios.post('http://localhost:5000/api/question-bank', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ Response:', response.data);

    // Check if the question was saved with department
    console.log('\n2. Checking if department was saved...');
    const allPapersResponse = await axios.get('http://localhost:5000/api/question-bank');
    const testPaper = allPapersResponse.data.find(paper => paper.subject_code === 'TEST003');
    
    if (testPaper) {
      console.log('✅ Test paper found:');
      console.log('   - Subject:', testPaper.subject_name);
      console.log('   - Department:', testPaper.department || 'N/A');
      console.log('   - CO:', testPaper.co || 'N/A');
      console.log('   - Level:', testPaper.level || 'N/A');
      console.log('   - Marks:', testPaper.marks || 'N/A');
    } else {
      console.log('❌ Test paper not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFormData();

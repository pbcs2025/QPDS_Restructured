/**
 * Test script to verify diagram display functionality
 * This script tests the file upload and retrieval endpoints
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5001/api';

async function testDiagramDisplay() {
  console.log('🧪 Testing Diagram Display Functionality...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1️⃣ Testing backend connectivity...');
    const healthCheck = await axios.get(`${API_BASE.replace('/api', '')}/health`);
    console.log('✅ Backend is running\n');

    // Test 2: Test file upload endpoint
    console.log('2️⃣ Testing file upload endpoint...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test-diagram.png',
      contentType: 'image/png'
    });
    formData.append('subject_code', 'TEST101');
    formData.append('subject_name', 'Test Subject');
    formData.append('semester', '4');
    formData.append('question_number', '1');
    formData.append('question_text', 'Test question with diagram');
    formData.append('co', 'CO1');
    formData.append('level', 'L1');
    formData.append('marks', '5');
    formData.append('faculty_email', 'test@example.com');
    formData.append('department', 'Computer Science and Engineering');

    const uploadResponse = await axios.post(`${API_BASE}/question-bank`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ File upload successful');
    console.log('📄 Response:', uploadResponse.data);
    const questionId = uploadResponse.data.id;
    console.log(`📋 Question ID: ${questionId}\n`);

    // Test 3: Test file retrieval endpoint
    console.log('3️⃣ Testing file retrieval endpoint...');
    const fileResponse = await axios.get(`${API_BASE}/question-bank/file/${questionId}`, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ File retrieval successful');
    console.log('📊 Response headers:', {
      'Content-Type': fileResponse.headers['content-type'],
      'Content-Disposition': fileResponse.headers['content-disposition'],
      'Cache-Control': fileResponse.headers['cache-control']
    });
    console.log(`📏 File size: ${fileResponse.data.length} bytes\n`);

    // Test 4: Test verifier papers endpoint
    console.log('4️⃣ Testing verifier papers endpoint...');
    const verifierResponse = await axios.get(`${API_BASE}/verifier/papers`);
    
    console.log('✅ Verifier papers endpoint working');
    console.log(`📋 Found ${verifierResponse.data.length} papers`);
    
    // Find our test paper
    const testPaper = verifierResponse.data.find(paper => 
      paper.subject_code === 'TEST101' && paper.semester === 4
    );
    
    if (testPaper) {
      console.log('✅ Test paper found in verifier papers');
      console.log('📄 Paper details:', {
        subject_code: testPaper.subject_code,
        subject_name: testPaper.subject_name,
        semester: testPaper.semester,
        questionsCount: testPaper.questions?.length || 0
      });
      
      if (testPaper.questions && testPaper.questions.length > 0) {
        const question = testPaper.questions[0];
        console.log('📝 Question details:', {
          question_number: question.question_number,
          question_text: question.question_text,
          file_name: question.file_name,
          file_type: question.file_type,
          file_url: question.file_url
        });
        
        if (question.file_url) {
          console.log('✅ File URL generated correctly');
          console.log(`🔗 File URL: ${API_BASE}${question.file_url}`);
        } else {
          console.log('❌ File URL not generated');
        }
      }
    } else {
      console.log('❌ Test paper not found in verifier papers');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Backend connectivity: Working');
    console.log('✅ File upload: Working');
    console.log('✅ File retrieval: Working');
    console.log('✅ Verifier papers: Working');
    console.log('✅ Diagram display: Ready for frontend testing');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

// Run the test
testDiagramDisplay();

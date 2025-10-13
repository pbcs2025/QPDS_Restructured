const axios = require('axios');

async function debugViaAPI() {
  console.log('🔍 Debugging via API...\n');

  try {
    // Test 1: Check all question papers
    console.log('1. Getting all question papers...');
    const allPapersResponse = await axios.get('http://localhost:5000/api/question-bank');
    const allPapers = allPapersResponse.data;
    console.log('✅ Total papers in database:', allPapers.length);

    // Show sample papers
    console.log('\n📋 Sample papers:');
    allPapers.slice(0, 5).forEach((paper, index) => {
      console.log(`${index + 1}. ${paper.subject_code} - ${paper.subject_name} (Dept: ${paper.department || 'N/A'})`);
    });

    // Check for the test paper we just created
    const testPapers = allPapers.filter(paper => paper.subject_code === 'TEST001');
    console.log('\n🧪 Test papers found:', testPapers.length);
    testPapers.forEach(paper => {
      console.log(`- ${paper.subject_code} - ${paper.subject_name} (Dept: ${paper.department || 'N/A'})`);
    });

    // Check what departments exist
    const departments = [...new Set(allPapers.map(paper => paper.department).filter(Boolean))];
    console.log('\n🏢 Departments in papers:', departments);

    // Test 2: Check verifier papers with different department filters
    console.log('\n2. Testing verifier paper retrieval with different filters...');
    
    // Try with the exact department from test paper
    try {
      const verifierResponse1 = await axios.get('http://localhost:5000/api/verifier/papers?department=Computer Science and Engineering&semester=4');
      console.log('✅ Verifier papers (Computer Science and Engineering, sem 4):', verifierResponse1.data.length);
    } catch (error) {
      console.log('❌ Error with Computer Science and Engineering filter:', error.response?.data || error.message);
    }

    // Try without department filter
    try {
      const verifierResponse2 = await axios.get('http://localhost:5000/api/verifier/papers');
      console.log('✅ Verifier papers (no filter):', verifierResponse2.data.length);
    } catch (error) {
      console.log('❌ Error without filter:', error.response?.data || error.message);
    }

    // Try with semester only
    try {
      const verifierResponse3 = await axios.get('http://localhost:5000/api/verifier/papers?semester=4');
      console.log('✅ Verifier papers (semester 4 only):', verifierResponse3.data.length);
    } catch (error) {
      console.log('❌ Error with semester filter:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugViaAPI();

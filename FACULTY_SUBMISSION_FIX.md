# 🔧 Faculty Submission Error Fix

## ❌ **Problem Identified: "Failed to save questions" Error**

### **Root Causes:**

1. **Database Connection Issues**
   - MongoDB server not running
   - Missing environment variables
   - Connection string configuration problems

2. **Faculty Department Mapping**
   - Department field not being populated correctly
   - Papers not being assigned to correct department verifiers

3. **API Endpoint Issues**
   - Missing error handling
   - Validation failures
   - Database operation errors

## ✅ **Complete Solution**

### **Step 1: Fix Database Connection**

1. **Install and Start MongoDB:**
   ```bash
   # Install MongoDB (if not installed)
   # Windows: Download from https://www.mongodb.com/try/download/community
   # Or use MongoDB Atlas (cloud)
   
   # Start MongoDB service
   # Windows: Start MongoDB service from Services
   # Linux/Mac: sudo systemctl start mongod
   ```

2. **Create Environment File:**
   Create `.env` file in `QPDS_Restructured/backend/`:
   ```env
   MONGO_URI=mongodb://localhost:27017/GAT_QPDS
   PORT=5001
   ```

### **Step 2: Fix Faculty Department Mapping**

**File:** `QPDS_Restructured/backend/src/controllers/questionBankController.js`

✅ **Already Fixed:** Department field mapping corrected from `faculty.deptName` to `faculty.department`

### **Step 3: Enhance Error Handling**

**File:** `QPDS_Restructured/backend/src/controllers/questionBankController.js`

Add better error handling:

```javascript
exports.create = async (req, res) => {
  const { subject_code, subject_name, semester, question_number, question_text, set_name, co, level, marks, faculty_email, department } = req.body;
  const file = req.file;

  // Enhanced validation
  if (!subject_code || !subject_name || !semester || !question_number || !question_text) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['subject_code', 'subject_name', 'semester', 'question_number', 'question_text']
    });
  }

  try {
    // Normalize semester to number
    const semNum = parseInt(semester, 10);
    if (Number.isNaN(semNum)) {
      return res.status(400).json({ error: 'semester must be a number' });
    }

    // Derive department if missing
    let derivedDept = (department || '').trim();
    if (!derivedDept && faculty_email) {
      const faculty = await Faculty.findOne({ email: faculty_email }).lean();
      if (faculty && faculty.department) {
        derivedDept = faculty.department;
        console.log(`✅ Department derived from faculty: ${derivedDept}`);
      } else {
        console.log(`⚠️  Faculty not found or no department: ${faculty_email}`);
      }
    }

    // Check for duplicate question
    const exists = await QuestionPaper.findOne({ subject_code, semester: semNum, question_number }).lean();
    if (exists) {
      return res.status(409).json({ 
        error: 'Question already exists',
        existing_question: {
          subject_code: exists.subject_code,
          semester: exists.semester,
          question_number: exists.question_number
        }
      });
    }

    // Determine set_name
    let finalSetName = set_name;
    if (!finalSetName) {
      finalSetName = await getSetName(subject_code, semNum, true);
    }

    const doc = await QuestionPaper.create({
      subject_code,
      subject_name,
      semester: semNum,
      set_name: finalSetName,
      question_number,
      question_text,
      co: co || '',
      level: level || '',
      marks: typeof marks === 'number' ? marks : 0,
      department: derivedDept || '',
      file_name: file ? file.originalname : null,
      file_type: file ? file.mimetype : null,
      question_file: file ? file.buffer : null,
      status: 'pending' // Set status to pending for verifier review
    });

    console.log(`✅ Question saved: ${doc._id} for department: ${derivedDept}`);

    // Update assignment status if faculty email is provided
    if (faculty_email) {
      await updateAssignmentStatus(subject_code, faculty_email);
    }

    res.json({ 
      message: '✅ Question saved successfully', 
      id: doc._id, 
      set_name: finalSetName,
      department: derivedDept
    });
  } catch (err) {
    console.error('❌ Error inserting data:', err.message);
    console.error('❌ Full error:', err);
    res.status(500).json({ 
      error: 'Database error', 
      details: err.message,
      suggestion: 'Check database connection and try again'
    });
  }
};
```

### **Step 4: Ensure Department Verifier Assignment**

**File:** `QPDS_Restructured/backend/src/controllers/verifierController.js`

✅ **Already Enhanced:** Added debugging logs to track department filtering

### **Step 5: Frontend Error Handling**

**File:** `QPDS_Restructured/frontend_end/src/common/questionPaperBuilder.js`

Enhance error handling in the frontend:

```javascript
const saveQuestionPaper = async (isDraft = false) => {
  try {
    const now = new Date().toISOString();
    
    // ... existing code ...

    // Save SEE modules to server
    for (let mod of modules) {
      for (let group of mod.groups) {
        for (let q of group) {
          if (q.text.trim() !== "") {
            const formData = new FormData();
            formData.append("subject_code", subjectCode);
            formData.append("subject_name", subject);
            formData.append("semester", semester);
            formData.append("question_number", q.label);
            formData.append("question_text", q.text);
            formData.append("co", q.co);
            formData.append("level", q.level);
            formData.append("marks", q.marks);
            formData.append("faculty_email", facultyEmail);
            formData.append("exam_type", "SEE");
            if (q.image) formData.append("file", q.image);

            try {
              const response = await axios.post(
                `${API_BASE}/question-bank`,
                formData,
                {
                  headers: { "Content-Type": "multipart/form-data" },
                }
              );
              
              console.log(`✅ Question ${q.label} saved:`, response.data);
            } catch (error) {
              console.error(`❌ Error saving question ${q.label}:`, error.response?.data || error.message);
              throw new Error(`Failed to save question ${q.label}: ${error.response?.data?.error || error.message}`);
            }
          }
        }
      }
    }

    // Mark as submitted and clear draft
    setIsSubmitted(true);
    const draftKey = `questionPaper_draft_${facultyEmail}`;
    localStorage.removeItem(draftKey);
    
    alert("✅ All questions submitted successfully!");
  } catch (error) {
    console.error("❌ Error saving question bank:", error);
    alert(`❌ Failed to save questions: ${error.message}`);
  }
};
```

## 🚀 **Testing Instructions**

### **1. Start Backend Server:**
```bash
cd QPDS_Restructured/backend
npm install
npm start
```

### **2. Start Frontend Server:**
```bash
cd QPDS_Restructured/frontend_end
npm install
npm start
```

### **3. Test Faculty Submission:**
1. Login as Faculty
2. Create a question paper
3. Submit the paper
4. Check browser console for detailed error messages
5. Check backend logs for debugging information

### **4. Test Verifier Assignment:**
1. Login as Verifier
2. Go to Question Papers tab
3. Papers should appear with correct department
4. Verify department filtering works

## 🔍 **Debugging Steps**

### **If "Failed to save questions" still occurs:**

1. **Check Database Connection:**
   ```bash
   # Test MongoDB connection
   mongosh
   use GAT_QPDS
   db.questionpapers.find().limit(1)
   ```

2. **Check Backend Logs:**
   - Look for "✅ Department derived from faculty" messages
   - Check for database connection errors
   - Verify faculty records exist

3. **Check Frontend Console:**
   - Look for detailed error messages
   - Check network requests in browser dev tools
   - Verify API endpoint responses

4. **Verify Faculty Records:**
   - Ensure faculty is registered in the system
   - Check faculty has correct department assigned
   - Verify faculty email matches submission

## 📋 **Expected Results After Fix**

✅ **Faculty submissions** will save successfully  
✅ **Department field** will be populated correctly  
✅ **Papers will appear** in correct department verifier dashboard  
✅ **Error messages** will be more descriptive  
✅ **Debugging information** will be available in logs  

## 🎯 **Summary**

The "Failed to save questions" error is primarily caused by:
1. Database connection issues
2. Missing department field mapping
3. Insufficient error handling

With these fixes, faculty submissions should work correctly and papers will be assigned to the appropriate department verifiers.

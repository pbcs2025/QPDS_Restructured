# Faculty Assigned Papers & SEE/CIE Dropdown Fix

## 🐛 Problems Identified

### 1. **Assigned Papers Not Displaying**
**Issue:** Faculty dashboard was calling wrong port number  
- Frontend was calling: `http://localhost:5000/api/faculty/assignments/:email`  
- Backend is running on: `http://localhost:5001`

### 2. **SEE/CIE Dropdown**
The dropdown is actually present in the code at lines 644-654 of `questionPaperBuilder.js`. If you can't see it, it might be a scrolling or visibility issue.

## ✅ Changes Made

### File: `frontend_end/src/roles/faculty/Facultydashboard.js`

**Changes:**
1. Added `API_BASE` constant using environment variable with fallback
2. Updated all hardcoded URLs to use `API_BASE`
3. Added better error logging for debugging

**Before:**
```javascript
const response = await axios.get(`http://localhost:5000/api/faculty/assignments/${email}`);
```

**After:**
```javascript
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
const response = await axios.get(`${API_BASE}/faculty/assignments/${email}`);
```

## 🔍 How to Test

### Testing Assigned Papers Display:

1. **Start the backend server:**
   ```bash
   cd QPDS_Restructured/backend
   npm start
   ```
   (Should start on port 5001)

2. **Start the frontend:**
   ```bash
   cd QPDS_Restructured/frontend_end
   npm start
   ```

3. **Login as a faculty member**
4. **Click on "📋 Assigned Papers" tab** in the sidebar
5. You should now see assigned papers instead of "No papers assigned"

### Testing SEE/CIE Dropdown:

1. **Go to "📝 Question Paper Builder"** from faculty dashboard
2. **Look for "Exam Type:" dropdown** at the top of the form
3. You should see:
   - Label: "Exam Type:"
   - Dropdown with options: "SEE" and "CIE"
4. **The dropdown should be right after the timestamp/save notification and before "Subject Code" field**

## 📊 Expected Behavior

### Faculty Dashboard - Assigned Papers Tab:
- Shows summary statistics (Total, Pending, Overdue)
- Displays table with:
  - Subject Code
  - Subject Name  
  - Assigned Date
  - Submission Date
  - Status (color-coded badges)
  - "Create Paper" button (for non-submitted papers)

### Question Paper Builder - Exam Type:
- Dropdown should be visible at the top
- Shows "Exam Type:" label
- Dropdown with "SEE" and "CIE" options
- Positioned before Subject Code selection

## 🐛 Troubleshooting

### If Assigned Papers Still Don't Show:

1. **Check backend console** for any errors
2. **Check browser console** (F12) for network errors
3. **Verify the faculty has assignments** in the database:
   ```bash
   # Connect to MongoDB and check
   db.assignments.find({email: "faculty@example.com"})
   ```

4. **Check the network tab** in browser dev tools:
   - Should see GET request to `/api/faculty/assignments/:email`
   - Should return 200 status
   - Response should contain `assignments` array

### If SEE/CIE Dropdown Not Visible:

1. **Scroll to the top** of the Question Paper Builder page
2. **Look after any draft notifications** or timestamp
3. **Check CSS** - ensure `.exam-type-selection` styling is applied
4. **Verify examType state** is set to "SEE" by default
5. **Check if any error messages** are blocking the view

## 📝 Files Modified

1. `QPDS_Restructured/frontend_end/src/roles/faculty/Facultydashboard.js`
   - Line 7: Added `API_BASE` constant
   - Line 41-45: Updated fetch to use correct port and added logging
   - Line 117: Updated reset-password to use correct port

## 💡 Notes

- The backend route `/api/faculty/assignments/:email` is already configured in `backend/src/routes/index.js` (line 15)
- The controller function `getFacultyAssignments` is in `backend/src/controllers/assignmentController.js`
- Port mismatch was the main issue - all requests now use port 5001

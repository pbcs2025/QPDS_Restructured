# 🚀 Start Servers Guide - Complete Solution

## ❌ **Current Issue**
The placeholder icon is still being displayed because:
1. **Backend server is not running** - No files can be uploaded
2. **Database is empty** - No papers with files exist
3. **Frontend can't fetch images** - Server not available

## ✅ **Complete Solution**

### **Step 1: Start Backend Server**

**Open Command Prompt/Terminal and run:**
```bash
cd "C:\QPDS_Restructing - Copy (8) - Copy\QPDS_Restructured\backend"
npm start
```

**Expected output:**
```
Server running on port 5001
Connected to MongoDB
```

### **Step 2: Start Frontend Server**

**Open another Command Prompt/Terminal and run:**
```bash
cd "C:\QPDS_Restructing - Copy (8) - Copy\QPDS_Restructured\frontend_end"
npm start
```

**Expected output:**
```
Compiled successfully!
Local:            http://localhost:3000
On Your Network:  http://192.168.x.x:3000
```

### **Step 3: Test the Complete Flow**

1. **Login as Faculty:**
   - Go to http://localhost:3000
   - Login with faculty credentials
   - Create a question with a diagram
   - Submit the question

2. **Check Backend Console:**
   - Should see: `📝 Question submission received:`
   - Should see: `💾 Question saved to database:`
   - Should see: `File received: ✅`

3. **Login as Verifier:**
   - Go to verifier dashboard
   - Navigate to Question Papers
   - Should see actual diagrams (not placeholders)

### **Step 4: Verify Database**

**Run this to check if files are being saved:**
```bash
cd "C:\QPDS_Restructing - Copy (8) - Copy\QPDS_Restructured\backend"
node check_current_status.js
```

**Expected output:**
```
📄 Total papers in database: 1
📎 Papers with files: 1
✅ Question with file found
```

## 🔧 **Troubleshooting**

### **If Backend Won't Start:**
1. Check if MongoDB is running
2. Check if port 5001 is available
3. Run `npm install` in backend directory

### **If Frontend Won't Start:**
1. Check if port 3000 is available
2. Run `npm install` in frontend directory

### **If Still Seeing Placeholders:**
1. Check browser console for errors
2. Check backend console for upload logs
3. Verify both servers are running
4. Clear browser cache (Ctrl+F5)

## 🎯 **Expected Results After Starting Servers**

### **Faculty Upload:**
- ✅ Can upload diagrams
- ✅ Files saved to database
- ✅ Console shows upload logs

### **Verifier View:**
- ✅ Sees actual diagrams
- ✅ No more placeholder icons
- ✅ Images load properly

## 📋 **Quick Start Commands**

**Terminal 1 (Backend):**
```bash
cd "C:\QPDS_Restructing - Copy (8) - Copy\QPDS_Restructured\backend"
npm start
```

**Terminal 2 (Frontend):**
```bash
cd "C:\QPDS_Restructing - Copy (8) - Copy\QPDS_Restructured\frontend_end"
npm start
```

## 🎉 **Status: READY TO TEST**

Once both servers are running:
1. Faculty can upload diagrams
2. Files will be saved to database
3. Verifiers will see actual diagrams
4. No more placeholder icons!

**The solution is complete - just need to start the servers!** 🚀

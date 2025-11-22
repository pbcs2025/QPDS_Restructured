# JWT Authentication & Authorization Testing Guide

## Issues Fixed

1. ✅ **Missing Faculty Import**: Added `const Faculty = require('../models/Faculty');` at the top of `authController.js`
2. ✅ **Role Mismatch**: Fixed role normalization - Faculty model uses `'faculty'` (lowercase) but middleware expects `'Faculty'` (capitalized)
3. ✅ **Super Admin Role**: Updated middleware to accept both `"Super Admin"` and `"SuperAdmin"` for compatibility
4. ✅ **JWT Token Role**: Ensured JWT tokens contain normalized role values that match middleware expectations

## How to Test Authentication & Authorization

### Prerequisites

1. Make sure your backend server is running
2. Ensure `JWT_SECRET` is set in your `.env` file
3. Have a faculty user account in your database

### Test 1: Login Flow (Faculty)

**Step 1: Login Request**
```bash
POST http://localhost:YOUR_PORT/api/faculty/login
Content-Type: application/json

{
  "username": "faculty@example.com",
  "password": "your_password_hash"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification code sent to email"
}
```

**Step 2: Verify Code**
```bash
POST http://localhost:YOUR_PORT/api/verify
Content-Type: application/json

{
  "email": "faculty@example.com",
  "code": "123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "Faculty",
  "name": "Faculty Name"
}
```

**Save the token** - you'll need it for protected routes!

### Test 2: Protected Route (Any Authenticated User)

**Test: Get Departments**
```bash
GET http://localhost:YOUR_PORT/api/departments
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response:**
- ✅ **200 OK** with departments array if token is valid
- ❌ **401 Unauthorized** if token is missing/invalid/expired
- ❌ **403 Forbidden** if no token provided

### Test 3: Super Admin Only Route

**Test: Get Internal Users**
```bash
GET http://localhost:YOUR_PORT/api/users
Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN
```

**Expected Response:**
- ✅ **200 OK** with users array if user is Super Admin
- ❌ **403 Forbidden** if user is not Super Admin (e.g., Faculty user)
- ❌ **401 Unauthorized** if token is invalid

### Test 4: Invalid Token Scenarios

**Test 4a: No Token**
```bash
GET http://localhost:YOUR_PORT/api/departments
```

**Expected Response:**
```json
{
  "message": "No token provided"
}
```
Status: **403 Forbidden**

**Test 4b: Invalid Token**
```bash
GET http://localhost:YOUR_PORT/api/departments
Authorization: Bearer invalid_token_here
```

**Expected Response:**
```json
{
  "message": "Invalid or expired token"
}
```
Status: **401 Unauthorized**

**Test 4c: Expired Token**
- Wait for token to expire (default: 1 hour)
- Try using the expired token

**Expected Response:**
```json
{
  "message": "Invalid or expired token"
}
```
Status: **401 Unauthorized**

### Test 5: Role-Based Authorization

**Test 5a: Faculty accessing Super Admin route**
```bash
GET http://localhost:YOUR_PORT/api/users
Authorization: Bearer FACULTY_TOKEN_HERE
```

**Expected Response:**
```json
{
  "message": "Access denied"
}
```
Status: **403 Forbidden**

**Test 5b: Faculty accessing Faculty-only route (if exists)**
```bash
# Example: If you have a route with isFaculty middleware
GET http://localhost:YOUR_PORT/api/faculty/some-route
Authorization: Bearer FACULTY_TOKEN_HERE
```

**Expected Response:**
- ✅ **200 OK** if route exists and user is Faculty
- ❌ **403 Forbidden** if user is not Faculty

## Using cURL for Testing

### Example: Complete Login Flow
```bash
# 1. Login
curl -X POST http://localhost:3000/api/faculty/login \
  -H "Content-Type: application/json" \
  -d '{"username":"faculty@example.com","password":"password_hash"}'

# 2. Verify (replace CODE with actual code from email)
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"faculty@example.com","code":"123456"}'

# 3. Use token for protected route (replace TOKEN with actual token)
curl -X GET http://localhost:3000/api/departments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Using Postman/Insomnia

1. **Create a new request** for login
2. **Set method** to POST
3. **Set URL** to `http://localhost:YOUR_PORT/api/faculty/login`
4. **Add body** (JSON):
   ```json
   {
     "username": "faculty@example.com",
     "password": "password_hash"
   }
   ```
5. **Send request** and check email for verification code
6. **Create verify request** with code
7. **Copy the token** from response
8. **For protected routes**, add header:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`

## Debugging Tips

### Check Token Contents
You can decode JWT tokens at https://jwt.io to verify:
- Token contains correct `id`, `role`, and `email`
- Token hasn't expired
- Role is properly normalized (should be "Faculty", not "faculty")

### Check Server Logs
Look for:
- `"VERIFY REQ BODY:"` - shows verification request
- `"FOUND FACULTY:"` - shows found faculty user
- Any error messages during authentication

### Common Issues

1. **401 Unauthorized**
   - Token missing from Authorization header
   - Token expired (check expiration time)
   - Invalid JWT_SECRET
   - Token format incorrect (should be `Bearer TOKEN`)

2. **403 Forbidden**
   - No token provided
   - User role doesn't match required role
   - Role mismatch (check if role is normalized correctly)

3. **500 Server Error**
   - Check server logs for detailed error
   - Verify database connection
   - Check if Faculty model is properly imported

## Verification Checklist

- [ ] Login endpoint sends verification code
- [ ] Verify endpoint returns valid JWT token
- [ ] Token contains correct role ("Faculty" capitalized)
- [ ] Protected routes accept valid tokens
- [ ] Protected routes reject invalid/missing tokens
- [ ] Super Admin routes reject non-Super Admin users
- [ ] Faculty routes accept Faculty users
- [ ] Expired tokens are rejected
- [ ] Token format is correct (Bearer TOKEN)

## Quick Test Script

Save this as `test-auth.js` and run with Node.js:

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const email = 'faculty@example.com';
const password = 'password_hash';

async function testAuth() {
  try {
    // 1. Login
    console.log('1. Testing login...');
    const loginRes = await axios.post(`${API_BASE}/faculty/login`, {
      username: email,
      password: password
    });
    console.log('✅ Login successful:', loginRes.data);
    
    // 2. Verify (you'll need to input the code manually)
    const code = prompt('Enter verification code from email: ');
    const verifyRes = await axios.post(`${API_BASE}/verify`, {
      email: email,
      code: code
    });
    console.log('✅ Verification successful:', verifyRes.data);
    
    const token = verifyRes.data.token;
    
    // 3. Test protected route
    console.log('3. Testing protected route...');
    const deptRes = await axios.get(`${API_BASE}/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Protected route accessible:', deptRes.data);
    
    // 4. Test unauthorized access
    console.log('4. Testing unauthorized access...');
    try {
      await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('✅ Authorization working - Faculty cannot access Super Admin route');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuth();
```




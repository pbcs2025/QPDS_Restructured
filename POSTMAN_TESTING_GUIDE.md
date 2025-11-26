# Postman Testing Guide for Faculty & Verifier Login/Logout

This guide shows you how to test Faculty and Verifier login/logout activities using Postman.

## Base URL
```
http://localhost:5001/api
```
*(Replace with your actual backend URL if different)*

---

## 📋 FACULTY LOGIN & LOGOUT

### Step 1: Faculty Login (Request Verification Code)

**Endpoint:** `POST /faculty/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "username": "faculty@example.com",
  "password": "your_password"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification code sent to email",
  "code": "123456"  // Only if email not configured
}
```

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:5001/api/faculty/login`
3. Headers: Add `Content-Type: application/json`
4. Body: Select `raw` → `JSON`, paste the JSON above

---

### Step 2: Faculty Verify (Complete Login)

**Endpoint:** `POST /faculty/verify`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
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
  "facultyData": {
    "id": "...",
    "name": "Faculty Name",
    "email": "faculty@example.com",
    "department": "Computer Science",
    "clgName": "Global Academy of Technology",
    "contactNumber": "1234567890",
    "type": "internal"
  }
}
```

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:5001/api/faculty/verify`
3. Headers: Add `Content-Type: application/json`
4. Body: Select `raw` → `JSON`, paste the JSON above

**Note:** This step logs the login activity to the database.

---

### Step 3: Faculty Logout

**Endpoint:** `POST /logout`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body (JSON):**
```json
{}
```
*(Empty body is fine)*

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:5001/api/logout`
3. Headers: 
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_TOKEN_HERE`
4. Body: Select `raw` → `JSON`, use `{}` or leave empty

**Note:** 
- You need a JWT token from the verify step (if your system returns one)
- If faculty verify doesn't return a token, you may need to use the general `/api/verify` endpoint instead

---

## ✅ VERIFIER LOGIN & LOGOUT

### Step 1: Verifier Login (Single Step)

**Endpoint:** `POST /verifier/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "username": "verifier1",
  "password": "verifier_password"
}
```

**Expected Response:**
```json
{
  "success": true,
  "verifier": {
    "_id": "...",
    "username": "verifier1",
    "name": "Verifier Name",
    "department": "Computer Science",
    "isActive": true
  }
}
```

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:5001/api/verifier/login`
3. Headers: Add `Content-Type: application/json`
4. Body: Select `raw` → `JSON`, paste the JSON above

**Note:** This step logs the login activity to the database.

---

### Step 2: Verifier Logout

**Endpoint:** `POST /logout`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body (JSON):**
```json
{}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:5001/api/logout`
3. Headers: 
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_TOKEN_HERE`
4. Body: Select `raw` → `JSON`, use `{}` or leave empty

**Note:** 
- Verifier login doesn't return a JWT token in the current implementation
- You may need to use the general `/api/login` and `/api/verify` flow for verifiers if you need a token

---

## 🔍 VIEWING ACTIVITIES

### Get Grouped Activities (SuperAdmin Only)

**Endpoint:** `GET /sessions/activities/grouped?hours=24`

**Headers:**
```
Authorization: Bearer SUPERADMIN_JWT_TOKEN
```

**Query Parameters:**
- `hours` (optional): Time range in hours (default: 24)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "faculty": [
      {
        "_id": "...",
        "userId": "...",
        "username": "faculty@example.com",
        "name": "Faculty Name",
        "role": "Faculty",
        "usertype": "internal",
        "activityType": "login",
        "description": "Logged in successfully",
        "timestamp": "2025-01-20T10:30:00.000Z",
        "ipAddress": "127.0.0.1"
      }
    ],
    "verifier": [
      {
        "_id": "...",
        "userId": "...",
        "username": "verifier1",
        "name": "Verifier Name",
        "role": "Verifier",
        "usertype": "internal",
        "activityType": "login",
        "description": "Logged in successfully",
        "timestamp": "2025-01-20T10:35:00.000Z",
        "ipAddress": "127.0.0.1"
      }
    ]
  }
}
```

**Postman Setup:**
1. Method: `GET`
2. URL: `http://localhost:5001/api/sessions/activities/grouped?hours=24`
3. Headers: Add `Authorization: Bearer SUPERADMIN_TOKEN`

---

## 📝 POSTMAN COLLECTION SETUP

### Create a Collection

1. Create a new collection: "Faculty & Verifier Testing"
2. Add environment variables:
   - `base_url`: `http://localhost:5001/api`
   - `faculty_email`: `faculty@example.com`
   - `faculty_password`: `your_password`
   - `verifier_username`: `verifier1`
   - `verifier_password`: `verifier_password`
   - `token`: (will be set automatically)

### Request Order

1. **Faculty Login** → Save verification code from response
2. **Faculty Verify** → Save token if returned
3. **Faculty Logout** → Use token from step 2
4. **Verifier Login** → Save verifier data
5. **Verifier Logout** → Use token (if available)
6. **View Activities** → Use SuperAdmin token

---

## 🧪 TESTING CHECKLIST

### Faculty Flow
- [ ] Faculty login request returns verification code
- [ ] Faculty verify with correct code succeeds
- [ ] Faculty verify logs activity to database
- [ ] Faculty logout logs activity to database
- [ ] Activities appear in `/sessions/activities/grouped` endpoint

### Verifier Flow
- [ ] Verifier login with correct credentials succeeds
- [ ] Verifier login logs activity to database
- [ ] Verifier logout logs activity to database
- [ ] Activities appear in `/sessions/activities/grouped` endpoint

### Error Cases
- [ ] Faculty login with wrong password returns 401
- [ ] Faculty verify with wrong code returns 400
- [ ] Verifier login with wrong credentials returns 401
- [ ] Logout without token returns 401

---

## 💡 TIPS

1. **Save Tokens**: Use Postman's "Tests" tab to automatically save tokens:
   ```javascript
   if (pm.response.code === 200) {
       var jsonData = pm.response.json();
       if (jsonData.token) {
           pm.environment.set("token", jsonData.token);
       }
   }
   ```

2. **Use Variables**: Replace hardcoded values with `{{base_url}}`, `{{faculty_email}}`, etc.

3. **Check Console**: Monitor backend console for activity logging messages

4. **Database Check**: You can also verify activities directly in MongoDB:
   ```javascript
   db.sessionactivities.find().sort({ timestamp: -1 }).limit(10)
   ```

---

## 🔗 RELATED ENDPOINTS

- `GET /sessions/activities` - Get all activities (with optional role filter)
- `GET /sessions/activities/user/:userId` - Get activities for specific user
- `POST /api/login` - General login (sends verification code)
- `POST /api/verify` - General verify (returns JWT token)

---

## ⚠️ NOTES

1. **Faculty Login** is a 2-step process (login → verify)
2. **Verifier Login** is a 1-step process (direct login)
3. **Logout** requires authentication token
4. **Activity Logging** happens automatically on successful login/verify
5. **SuperAdmin** can view all activities via the sessions endpoint



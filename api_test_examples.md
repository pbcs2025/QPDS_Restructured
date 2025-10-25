# Question Paper Approval System - API Test Examples

This document provides example commands to test the Question Paper Approval System API endpoints using both Axios (JavaScript) and curl (command line).

## 1. Create a Paper (POST /api/papers)

### Axios Example
```javascript
axios.post('http://localhost:3000/api/papers', {
  facultyId: '60d0fe4f5311236168a109ca', // Replace with actual faculty ID
  title: 'Database Management Systems - Final Exam',
  content: {
    questions: [
      {
        question: 'Explain the concept of normalization in database design.',
        marks: 10
      },
      {
        question: 'Compare and contrast SQL and NoSQL databases.',
        marks: 10
      }
    ]
  },
  subject_code: 'CS301',
  subject_name: 'Database Management Systems',
  department: 'Computer Science',
  semester: '5'
})
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

### curl Example
```bash
curl -X POST http://localhost:3000/api/papers \
  -H "Content-Type: application/json" \
  -d '{
    "facultyId": "60d0fe4f5311236168a109ca",
    "title": "Database Management Systems - Final Exam",
    "content": {
      "questions": [
        {
          "question": "Explain the concept of normalization in database design.",
          "marks": 10
        },
        {
          "question": "Compare and contrast SQL and NoSQL databases.",
          "marks": 10
        }
      ]
    },
    "subject_code": "CS301",
    "subject_name": "Database Management Systems",
    "department": "Computer Science",
    "semester": "5"
  }'
```

## 2. List Submitted Papers (GET /api/papers)

### Axios Example
```javascript
axios.get('http://localhost:3000/api/papers')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

### curl Example
```bash
curl -X GET http://localhost:3000/api/papers
```

## 3. Approve a Paper (PUT /api/papers/:id/approve)

### Axios Example
```javascript
const paperId = '60d0fe4f5311236168a109cb'; // Replace with actual paper ID

axios.put(`http://localhost:3000/api/papers/${paperId}/approve`, {
  approvedBy: 'verifier@example.com',
  remarks: 'Approved by verifier'
})
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

### curl Example
```bash
curl -X PUT http://localhost:3000/api/papers/60d0fe4f5311236168a109cb/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBy": "verifier@example.com",
    "remarks": "Approved by verifier"
  }'
```

## 4. Reject a Paper (PUT /api/papers/:id/reject)

### Axios Example
```javascript
const paperId = '60d0fe4f5311236168a109cc'; // Replace with actual paper ID

axios.put(`http://localhost:3000/api/papers/${paperId}/reject`, {
  rejectedBy: 'verifier@example.com',
  rejectReason: 'Paper does not meet the required standards'
})
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

### curl Example
```bash
curl -X PUT http://localhost:3000/api/papers/60d0fe4f5311236168a109cc/reject \
  -H "Content-Type: application/json" \
  -d '{
    "rejectedBy": "verifier@example.com",
    "rejectReason": "Paper does not meet the required standards"
  }'
```

## 5. Fetch Approved Papers (GET /api/approvedpapers)

### Axios Example
```javascript
axios.get('http://localhost:3000/api/approvedpapers')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

### curl Example
```bash
curl -X GET http://localhost:3000/api/approvedpapers
```

## 6. Fetch Rejected Papers (GET /api/rejectedpapers)

### Axios Example
```javascript
axios.get('http://localhost:3000/api/rejectedpapers')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

### curl Example
```bash
curl -X GET http://localhost:3000/api/rejectedpapers
```
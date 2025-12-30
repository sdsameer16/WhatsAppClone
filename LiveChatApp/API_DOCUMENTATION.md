# API Documentation - College Messaging System

Base URL: `http://localhost:5000`

## 📋 Table of Contents
- [Authentication](#authentication)
- [Student APIs](#student-apis)
- [Admin APIs](#admin-apis)
- [Batch & Branch APIs](#batch--branch-apis)
- [Message APIs](#message-apis)
- [Socket.io Events](#socketio-events)

---

## 🔐 Authentication

All protected endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 👨‍🎓 Student APIs

### 1. Student Registration

**POST** `/api/student/register`

Register a new student account.

**Request Body:**
```json
{
  "studentId": "ST2023001",
  "name": "John Doe",
  "password": "student123",
  "branch": "CSE",
  "startYear": 2023,
  "endYear": 2027
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": {
    "studentId": "ST2023001",
    "name": "John Doe",
    "branch": "CSE",
    "batch": "2023-2027"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Student ID already exists"
}
```

---

### 2. Student Login

**POST** `/api/student/login`

Login with student credentials.

**Request Body:**
```json
{
  "studentId": "ST2023001",
  "password": "student123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": {
    "studentId": "ST2023001",
    "name": "John Doe",
    "branch": "CSE",
    "batch": "2023-2027",
    "startYear": 2023,
    "endYear": 2027
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

---

### 3. Update FCM Token

**POST** `/api/student/fcm-token`

Update Firebase Cloud Messaging token for push notifications.

**Request Body:**
```json
{
  "studentId": "ST2023001",
  "fcmToken": "fXYZ123ABC..."
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## 👨‍💼 Admin APIs

### 1. Admin Login

**POST** `/api/admin/login`

Login with admin credentials.

**Request Body:**
```json
{
  "adminId": "HOD001",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "adminId": "HOD001",
    "name": "Dr. Admin",
    "role": "HOD",
    "department": "CSE"
  }
}
```

---

### 2. Create Admin

**POST** `/api/admin/create`

Create a new admin account (for initial setup).

**Request Body:**
```json
{
  "adminId": "HOD001",
  "name": "Dr. Admin",
  "password": "admin123",
  "department": "CSE"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Admin created successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Admin ID already exists"
}
```

---

## 📊 Batch & Branch APIs

### 1. Get All Batches

**GET** `/api/batches`

Get all batches with student counts and online status.

**Query Parameters:**
- `branch` (optional): Filter by specific branch (e.g., `CSE`)

**Request:**
```
GET /api/batches
GET /api/batches?branch=CSE
```

**Response (200 OK):**
```json
[
  {
    "batch": "2023-2027",
    "branch": "CSE",
    "studentCount": 25,
    "onlineCount": 15,
    "students": [
      {
        "studentId": "ST2023001",
        "name": "John Doe",
        "isOnline": true
      },
      {
        "studentId": "ST2023002",
        "name": "Jane Smith",
        "isOnline": false
      }
    ]
  },
  {
    "batch": "2023-2027",
    "branch": "ECE",
    "studentCount": 20,
    "onlineCount": 10,
    "students": [...]
  }
]
```

---

### 2. Get All Branches

**GET** `/api/branches`

Get list of all unique branches.

**Response (200 OK):**
```json
[
  "CSE",
  "ECE",
  "MECH",
  "CIVIL",
  "EEE"
]
```

---

### 3. Get Students by Filter

**GET** `/api/students`

Get students filtered by batches and branches.

**Query Parameters:**
- `batches` (optional): Comma-separated batch list (e.g., `2023-2027,2024-2028`)
- `branches` (optional): Comma-separated branch list (e.g., `CSE,ECE`)

**Request:**
```
GET /api/students?batches=2023-2027&branches=CSE,ECE
```

**Response (200 OK):**
```json
[
  {
    "studentId": "ST2023001",
    "name": "John Doe",
    "branch": "CSE",
    "batch": "2023-2027",
    "isOnline": true,
    "lastSeen": "2024-01-15T10:30:00.000Z"
  },
  {
    "studentId": "ST2023002",
    "name": "Jane Smith",
    "branch": "ECE",
    "batch": "2023-2027",
    "isOnline": false,
    "lastSeen": "2024-01-15T09:15:00.000Z"
  }
]
```

---

## 💬 Message APIs

### 1. Get Messages for Student

**GET** `/api/messages/:studentId`

Get all messages for a specific student based on their batch and branch.

**Request:**
```
GET /api/messages/ST2023001
```

**Response (200 OK):**
```json
[
  {
    "messageId": "550e8400-e29b-41d4-a716-446655440000",
    "sender": "admin",
    "senderName": "Dr. Admin",
    "message": "Welcome to the new semester!",
    "targetBatches": ["2023-2027"],
    "targetBranches": ["CSE", "ECE"],
    "timestamp": "2024-01-15T10:00:00.000Z"
  },
  {
    "messageId": "660e8400-e29b-41d4-a716-446655440001",
    "sender": "admin",
    "senderName": "Dr. Admin",
    "message": "Exam schedule has been updated.",
    "targetBatches": ["2023-2027"],
    "targetBranches": ["CSE"],
    "timestamp": "2024-01-16T14:30:00.000Z"
  }
]
```

---

### 2. Mark Message as Delivered

**POST** `/api/messages/:messageId/delivered`

Mark a message as delivered for a specific student.

**Request:**
```
POST /api/messages/550e8400-e29b-41d4-a716-446655440000/delivered
```

**Request Body:**
```json
{
  "studentId": "ST2023001"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## 🔌 Socket.io Events

### Client → Server Events

#### 1. registerStudent
Register student as online.

**Emit:**
```javascript
socket.emit('registerStudent', {
  studentId: 'ST2023001'
});
```

**Effect:**
- Updates student's `isOnline` status to `true`
- Updates `lastSeen` timestamp
- Sends pending messages to student
- Notifies admin about student count update

---

#### 2. registerAdmin
Register admin connection.

**Emit:**
```javascript
socket.emit('registerAdmin');
```

**Effect:**
- Registers admin socket
- Sends current batch info to admin

---

#### 3. sendBatchMessage
Admin sends message to selected batches/branches.

**Emit:**
```javascript
socket.emit('sendBatchMessage', {
  batches: ['2023-2027', '2024-2028'],
  branches: ['CSE', 'ECE'],
  message: 'Important announcement!',
  senderName: 'Dr. Admin'
});
```

**Effect:**
- Finds all matching students
- Saves message to MongoDB
- Sends to online students via socket
- Sends push notifications to offline students
- Returns delivery statistics

---

#### 4. markDelivered
Student marks message as delivered.

**Emit:**
```javascript
socket.emit('markDelivered', {
  messageId: '550e8400-e29b-41d4-a716-446655440000',
  studentId: 'ST2023001'
});
```

**Effect:**
- Updates message recipient status in database
- Marks `delivered: true` and sets `deliveredAt` timestamp

---

### Server → Client Events

#### 1. receiveMessage
Student receives a new message.

**Listen:**
```javascript
socket.on('receiveMessage', (data) => {
  console.log('New message:', data);
  // Add message to UI
});
```

**Data:**
```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "senderName": "Dr. Admin",
  "message": "Welcome to the new semester!",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

---

#### 2. messageSent
Admin receives message delivery confirmation.

**Listen:**
```javascript
socket.on('messageSent', (data) => {
  console.log('Message sent:', data);
  // Show toast notification
});
```

**Data:**
```json
{
  "success": true,
  "totalStudents": 50,
  "onlineCount": 30,
  "offlineCount": 20
}
```

**Error Data:**
```json
{
  "success": false,
  "error": "No students found for selected batches/branches"
}
```

---

#### 3. batchInfo
Admin receives updated batch information.

**Listen:**
```javascript
socket.on('batchInfo', (batches) => {
  console.log('Batch info:', batches);
  // Update UI with student counts
});
```

**Data:**
```json
[
  {
    "batch": "2023-2027",
    "branch": "CSE",
    "studentCount": 25,
    "onlineCount": 15
  },
  {
    "batch": "2023-2027",
    "branch": "ECE",
    "studentCount": 20,
    "onlineCount": 10
  }
]
```

---

## 🧪 Testing with cURL

### Register Student
```powershell
curl -X POST http://localhost:5000/api/student/register `
  -H "Content-Type: application/json" `
  -d '{
    "studentId": "ST2023001",
    "name": "John Doe",
    "password": "student123",
    "branch": "CSE",
    "startYear": 2023,
    "endYear": 2027
  }'
```

### Student Login
```powershell
curl -X POST http://localhost:5000/api/student/login `
  -H "Content-Type: application/json" `
  -d '{
    "studentId": "ST2023001",
    "password": "student123"
  }'
```

### Create Admin
```powershell
curl -X POST http://localhost:5000/api/admin/create `
  -H "Content-Type: application/json" `
  -d '{
    "adminId": "HOD001",
    "name": "Dr. Admin",
    "password": "admin123",
    "department": "CSE"
  }'
```

### Get Batches
```powershell
curl http://localhost:5000/api/batches
```

### Get Branches
```powershell
curl http://localhost:5000/api/branches
```

### Get Student Messages
```powershell
curl http://localhost:5000/api/messages/ST2023001
```

---

## 📝 Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Invalid credentials |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Database not connected |

---

## 🔐 Authentication Flow

1. **Register/Login:**
   - Call `/api/student/register` or `/api/student/login`
   - Receive JWT token in response

2. **Store Token:**
   - Save token in localStorage or sessionStorage

3. **Use Token:**
   - Include token in socket connection
   - Include token in protected API requests

4. **Token Expiry:**
   - Tokens expire after 7 days
   - User must login again after expiry

---

## 🎯 Common Use Cases

### Use Case 1: Student Registration & First Message

```powershell
# 1. Register
curl -X POST http://localhost:5000/api/student/register -H "Content-Type: application/json" -d '{"studentId":"ST2023001","name":"John","password":"pass123","branch":"CSE","startYear":2023,"endYear":2027}'

# Response: { "token": "eyJ...", "student": {...} }

# 2. Connect via Socket.io (in frontend)
socket.emit('registerStudent', { studentId: 'ST2023001' })

# 3. Listen for messages
socket.on('receiveMessage', (data) => {
  // Display message
})
```

### Use Case 2: Admin Sending Batch Message

```powershell
# 1. Login
curl -X POST http://localhost:5000/api/admin/login -H "Content-Type: application/json" -d '{"adminId":"HOD001","password":"admin123"}'

# 2. Get batches
curl http://localhost:5000/api/batches

# 3. Send message via Socket.io (in frontend)
socket.emit('sendBatchMessage', {
  batches: ['2023-2027'],
  branches: ['CSE', 'ECE'],
  message: 'Exam on Friday!',
  senderName: 'Dr. Admin'
})

# 4. Listen for confirmation
socket.on('messageSent', (data) => {
  // Show: "Sent to X students"
})
```

---

## 🛠️ Development Tips

1. **Enable CORS in development:**
   - Already configured in backend
   - All origins allowed: `cors: { origin: "*" }`

2. **Monitor Socket.io connections:**
   - Check backend console for connection logs
   - Use browser DevTools → Network → WS

3. **Test authentication:**
   - Use browser DevTools → Application → Local Storage
   - Verify JWT token is saved

4. **Debug messages:**
   - Check MongoDB for saved messages
   - Verify recipient delivery status

5. **Test push notifications:**
   - Configure Firebase (see README.md)
   - Test with app closed
   - Check Firebase console for delivery stats

---

## 📚 Additional Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [JWT.io](https://jwt.io/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

---

**Last Updated:** December 11, 2024

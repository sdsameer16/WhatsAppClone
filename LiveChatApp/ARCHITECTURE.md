# System Architecture & Flow Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        COLLEGE MESSAGING SYSTEM                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   STUDENT APP        │         │    ADMIN APP         │
│   (Port 5173)        │         │    (Port 5174)       │
│                      │         │                      │
│  ┌────────────────┐ │         │  ┌────────────────┐ │
│  │ Login/Register │ │         │  │  HOD Login     │ │
│  └────────────────┘ │         │  └────────────────┘ │
│  ┌────────────────┐ │         │  ┌────────────────┐ │
│  │ Message Board  │ │         │  │ Batch Selector │ │
│  └────────────────┘ │         │  └────────────────┘ │
│  ┌────────────────┐ │         │  ┌────────────────┐ │
│  │ Push Notif     │ │         │  │ Message Sender │ │
│  └────────────────┘ │         │  └────────────────┘ │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │  Socket.io + REST API          │
           │                                │
           └────────────┬───────────────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │   BACKEND SERVER       │
           │   (Port 5000)          │
           │                        │
           │  ┌──────────────────┐ │
           │  │ Express API      │ │
           │  │ - Auth Routes    │ │
           │  │ - Student Routes │ │
           │  │ - Batch Routes   │ │
           │  └──────────────────┘ │
           │  ┌──────────────────┐ │
           │  │ Socket.io Server │ │
           │  │ - Real-time msgs │ │
           │  │ - Online status  │ │
           │  └──────────────────┘ │
           │  ┌──────────────────┐ │
           │  │ Firebase Admin   │ │
           │  │ - Push notifs    │ │
           │  └──────────────────┘ │
           └────────┬───────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│   MongoDB       │   │  Firebase Cloud │
│                 │   │  Messaging      │
│ • Students      │   │                 │
│ • Admins        │   │ • Push Tokens   │
│ • Messages      │   │ • Notifications │
└─────────────────┘   └─────────────────┘
```

## 🔄 Message Flow

### Scenario 1: Student is ONLINE

```
1. HOD Login
   └─> Admin App (localhost:5174)
       └─> Enter HOD001 / admin123
           └─> Backend: POST /api/admin/login
               └─> JWT Token Generated
                   └─> Admin Dashboard Loaded

2. HOD Selects Target
   └─> Select Branches: [CSE, ECE]
       └─> Select Batches: [2023-2027]
           └─> Backend: GET /api/batches
               └─> Shows: "50 students (30 online)"

3. HOD Sends Message
   └─> Type: "Welcome to new semester!"
       └─> Click "Send to 50 Students"
           └─> Backend: Socket.emit('sendBatchMessage')
               └─> Backend finds 50 matching students
                   ├─> 30 ONLINE students
                   │   └─> Socket.emit('receiveMessage') ⚡ INSTANT
                   │       └─> Student Apps update in real-time
                   │           └─> Toast notification appears
                   │               └─> Message added to board
                   │
                   └─> 20 OFFLINE students
                       └─> Message saved to MongoDB 💾
                           └─> Firebase Push Notification 📱
                               └─> Phone buzzes even if app closed

4. Student Views Message
   └─> Already visible in message board
       └─> Shows: "👨‍💼 Dr. Admin - Welcome to new semester!"
           └─> Timestamp: "Just now"
```

### Scenario 2: Student is OFFLINE

```
1. HOD Sends Message (same as above)
   └─> Backend detects student is offline
       ├─> Saves to MongoDB
       │   └─> Collection: messages
       │       └─> {
       │             messageId: "uuid-123",
       │             targetBatches: ["2023-2027"],
       │             targetBranches: ["CSE"],
       │             recipients: [
       │               { studentId: "ST2023001", delivered: false }
       │             ]
       │           }
       │
       └─> Sends Firebase Push Notification
           └─> Student's phone receives notification
               └─> "New message from HOD"
               └─> Shows preview in notification tray

2. Student Opens App Later
   └─> Login with ST2023001 / student123
       └─> Backend: Socket.emit('registerStudent')
           └─> Backend marks student as ONLINE
               └─> Backend finds pending messages
                   └─> Socket.emit('receiveMessage')
                       └─> All missed messages delivered
                           └─> Message board populated
                               └─> Mark as delivered in DB
```

## 📊 Data Flow Diagram

### Student Registration Flow

```
Student App
    │
    │ 1. Fill Form:
    │    - Student ID: ST2023001
    │    - Name: John Doe
    │    - Password: ••••••
    │    - Branch: CSE
    │    - Start: 2023, End: 2027
    │
    ▼
POST /api/student/register
    │
    │ 2. Backend Processing:
    │    - Hash password (bcrypt)
    │    - Calculate batch: "2023-2027"
    │    - Generate JWT token
    │    - Save to MongoDB
    │
    ▼
MongoDB Students Collection
    {
      studentId: "ST2023001",
      name: "John Doe",
      password: "$2a$10$hashed...",
      branch: "CSE",
      batch: "2023-2027",
      startYear: 2023,
      endYear: 2027
    }
    │
    ▼
Response to Student App
    {
      success: true,
      token: "eyJhbGciOi...",
      student: { ... }
    }
    │
    ▼
Student App
    - Save token to localStorage
    - Redirect to message board
```

### Batch Message Flow

```
Admin Dashboard
    │
    │ 1. Select Targets:
    │    Branches: [CSE, ECE]
    │    Batches: [2023-2027, 2024-2028]
    │
    ▼
GET /api/batches
    │
    │ 2. Backend queries MongoDB:
    │    db.students.aggregate([
    │      { $match: { branch: {$in: ["CSE","ECE"]} } },
    │      { $group: { _id: "$batch", count: {$sum: 1} } }
    │    ])
    │
    ▼
Response: Batch Info
    [
      { batch: "2023-2027", branch: "CSE", count: 25, online: 15 },
      { batch: "2023-2027", branch: "ECE", count: 20, online: 10 },
      ...
    ]
    │
    ▼
Admin Sends Message
    │
    │ 3. Message: "Important announcement!"
    │
    ▼
Socket: sendBatchMessage
    │
    │ 4. Backend Processing:
    │    - Find matching students
    │    - Create message in DB
    │    - Loop through recipients
    │
    ├─────────────────────┬─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
ONLINE                ONLINE                OFFLINE
ST2023001            ST2023002            ST2024001
    │                     │                     │
    │ Socket.emit         │ Socket.emit         │ Save to DB
    │ 'receiveMessage'    │ 'receiveMessage'    │ Send Push
    │                     │                     │
    ▼                     ▼                     ▼
Student App          Student App           📱 Notification
- Toast notif        - Toast notif        - Phone buzzes
- Message added      - Message added      - Notification tray
- Real-time ⚡       - Real-time ⚡       - Opens app → sees message
```

## 🎯 User Journey Maps

### Student Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDENT JOURNEY                          │
└─────────────────────────────────────────────────────────────┘

1. First Time User
   Open App → See Login Screen
   └─> Click "New Student? Register Here"
       └─> Fill Registration Form
           └─> Submit → Account Created ✅
               └─> Auto Login → Message Board (empty)

2. Daily User (Returning)
   Open App → Auto Login (token saved)
   └─> See Message Board
       └─> 3 new messages from HOD
           └─> Read messages
               └─> Stay informed about college events

3. Offline User (App Closed)
   Phone Locked → App Not Running
   └─> HOD sends message
       └─> 📱 Push Notification received
           └─> "New message from Dr. Admin"
               └─> Tap notification
                   └─> App opens → See message
```

### HOD Journey

```
┌─────────────────────────────────────────────────────────────┐
│                     HOD JOURNEY                             │
└─────────────────────────────────────────────────────────────┘

1. Login
   Open Admin App
   └─> Enter HOD001 / admin123
       └─> Dashboard Loads
           └─> See all batches with student counts

2. Send Announcement
   Need to inform CSE 2023-2027 batch
   └─> Select Branch: CSE
       └─> Select Batch: 2023-2027
           └─> See: "25 students (15 online)"
               └─> Type message
                   └─> Click "Send to 25 Students"
                       └─> Toast: "Message sent: 15 online, 10 offline"
                           └─> Done! ✅

3. Send to Multiple Batches
   Department-wide announcement
   └─> Select Branches: CSE, ECE, MECH
       └─> Select Batches: 2023-2027, 2024-2028
           └─> See: "120 students (80 online)"
               └─> Type message
                   └─> Send to all
                       └─> Real-time delivery tracking
```

## 🔒 Security Flow

```
┌────────────────────────────────────────────────────────┐
│               AUTHENTICATION FLOW                      │
└────────────────────────────────────────────────────────┘

Registration
    Password "student123"
         │
         ▼
    bcrypt.hash(password, 10)
         │
         ▼
    "$2a$10$N9qo8uLO..." (stored in DB)

Login
    User enters: "student123"
         │
         ▼
    bcrypt.compare(input, dbHash)
         │
         ▼
    Match? → Generate JWT
         │
         ▼
    jwt.sign({ studentId, role }, SECRET, { expiresIn: '7d' })
         │
         ▼
    "eyJhbGciOiJIUzI1NiIs..." (sent to client)
         │
         ▼
    Stored in localStorage
         │
         ▼
    Included in all API requests
         │
         ▼
    Backend validates on each request
```

## 📱 Real-time Communication

```
┌────────────────────────────────────────────────────────┐
│           SOCKET.IO EVENT FLOW                         │
└────────────────────────────────────────────────────────┘

Student App Connects
    │
    ▼
socket.connect()
    │
    ▼
Backend: 'connection' event
    │
    ▼
Student: socket.emit('registerStudent', { studentId })
    │
    ▼
Backend: Update DB (isOnline: true)
    │
    ▼
Backend: Notify Admin (student count update)
    │
    ▼
Admin: socket.on('batchInfo', updateUI)

───────────────────────────────────────────────────

Admin Sends Message
    │
    ▼
socket.emit('sendBatchMessage', { batches, branches, message })
    │
    ▼
Backend: Process & Store in DB
    │
    ▼
Backend: Loop through recipients
    │
    ├─> Online? → socket.emit('receiveMessage')
    │               │
    │               ▼
    │           Student: socket.on('receiveMessage', addToUI)
    │
    └─> Offline? → Send Push Notification
                    │
                    ▼
                Firebase → Phone receives notification
```

---

## 📈 System Capacity

Current design supports:
- ✅ Unlimited students
- ✅ Unlimited batches
- ✅ Unlimited messages
- ✅ Real-time messaging (limited by server)
- ✅ Concurrent connections (limited by server)

Recommended limits (single server):
- Students: 10,000+
- Concurrent connections: 1,000+
- Messages per second: 100+

For larger scale, implement:
- Load balancing
- Redis for session management
- Message queue (RabbitMQ/Kafka)
- Microservices architecture

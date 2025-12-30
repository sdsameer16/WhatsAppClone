# WhatsApp Clone - College Batch Messaging System

A real-time messaging system designed for colleges where HOD (Head of Department) can send messages to specific student batches and branches. Students receive messages instantly if online, or via push notifications if offline.

## 🌟 Features

### For Students:
- ✅ Student registration with Student ID, Name, Password, Branch, and Graduation Years
- ✅ Secure login with JWT authentication
- ✅ View all messages from HOD in real-time
- ✅ Message history stored in MongoDB
- ✅ Push notifications when app is closed (Firebase)
- ✅ Automatic batch assignment based on graduation years

### For HOD/Admin:
- ✅ Secure admin login
- ✅ Select multiple batches (e.g., 2023-2027, 2024-2028)
- ✅ Filter by multiple branches (CSE, ECE, MECH, etc.)
- ✅ See student counts and online status per batch
- ✅ Send messages to selected batches/branches
- ✅ Real-time delivery tracking (online vs offline)
- ✅ Automatic push notifications for offline students

## 🏗️ Architecture

```
LiveChatApp/
├── backend/                    # Node.js + Express + Socket.io
│   ├── models/
│   │   ├── Student.js         # Student model with batch info
│   │   ├── Admin.js           # HOD/Admin model
│   │   └── Message.js         # Message model with recipients
│   ├── firebase-config.js     # Firebase admin setup
│   ├── server.js              # Main server file
│   └── package.json
│
├── parent-frontend/            # Student App (React + Vite)
│   ├── src/
│   │   ├── StudentChat.jsx   # Main student interface
│   │   ├── firebase.js       # Firebase client config
│   │   └── App.jsx
│   └── public/
│       └── firebase-messaging-sw.js
│
└── caretaker-frontend/         # Admin App (React + Vite)
    └── src/
        ├── AdminChat.jsx      # HOD dashboard
        └── App.jsx
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- MongoDB database (local or MongoDB Atlas)
- Firebase project (for push notifications)

### 1. Backend Setup

```powershell
cd LiveChatApp/backend
npm install
```

Create a `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/college-messaging
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5000

# Firebase Configuration (Optional - for push notifications)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Start the backend:
```powershell
npm start
```

### 2. Student Frontend Setup

```powershell
cd LiveChatApp/parent-frontend
npm install
```

Configure Firebase in `src/firebase.js` (optional, for push notifications):
- Replace `firebaseConfig` with your Firebase web app config
- Replace `VAPID_KEY` with your web push certificate

Start the student app:
```powershell
npm run dev
```

Access at: `http://localhost:5173`

### 3. Admin Frontend Setup

```powershell
cd LiveChatApp/caretaker-frontend
npm install
npm run dev
```

Access at: `http://localhost:5174`

## 📱 Usage Guide

### First Time Setup

#### 1. Create Admin Account
Use Postman or curl to create the first admin:

```powershell
curl -X POST http://localhost:5000/api/admin/create `
  -H "Content-Type: application/json" `
  -d '{
    "adminId": "HOD001",
    "name": "Dr. John Smith",
    "password": "securepassword123",
    "department": "CSE"
  }'
```

#### 2. Student Registration
1. Open student app: `http://localhost:5173`
2. Click "New Student? Register Here"
3. Fill in:
   - Student ID (e.g., ST2023001)
   - Full Name
   - Password
   - Branch (e.g., CSE, ECE, MECH)
   - Start Year: 2023
   - End Year: 2027
4. Click Register

#### 3. HOD Login
1. Open admin app: `http://localhost:5174`
2. Enter Admin ID and Password
3. Access the dashboard

### Sending Batch Messages

1. **Select Branches**: Choose one or more branches (CSE, ECE, etc.)
2. **Select Batches**: Choose one or more batch years (2023-2027, etc.)
3. **View Target Summary**: See how many students will receive the message
4. **Compose Message**: Type your message in the text area
5. **Send**: Click the send button
6. **See Results**: Toast notification shows online/offline delivery status

### Student Experience

1. **Login**: Use Student ID and password
2. **View Messages**: All messages from HOD appear in chronological order
3. **Real-time Updates**: New messages appear instantly if online
4. **Push Notifications**: Receive notifications when app is closed (if Firebase configured)
5. **Message History**: All past messages are accessible

## 🔥 Firebase Push Notifications Setup

### Backend Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file
6. Add credentials to backend `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

### Frontend Configuration

1. In Firebase Console, go to **Project Settings**
2. Scroll to **Your apps** section
3. Click the web icon (`</>`)
4. Register your app and copy the config
5. Update `parent-frontend/src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. Go to **Cloud Messaging** tab
7. Under **Web Push certificates**, click **Generate key pair**
8. Copy the VAPID key and update `firebase.js`:

```javascript
const VAPID_KEY = "YOUR_VAPID_KEY";
```

9. Update `public/firebase-messaging-sw.js` with the same config

## 🗄️ Database Models

### Student Model
```javascript
{
  studentId: String (unique),
  name: String,
  password: String (hashed),
  branch: String (CSE, ECE, etc.),
  startYear: Number,
  endYear: Number,
  batch: String (auto: "2023-2027"),
  fcmToken: String (for push notifications),
  isOnline: Boolean,
  lastSeen: Date
}
```

### Message Model
```javascript
{
  messageId: String (UUID),
  sender: "admin",
  senderName: String,
  message: String,
  targetBatches: [String] (["2023-2027", "2024-2028"]),
  targetBranches: [String] (["CSE", "ECE"]),
  recipients: [{
    studentId: String,
    delivered: Boolean,
    deliveredAt: Date
  }],
  timestamp: Date
}
```

## 🔐 API Endpoints

### Authentication
- `POST /api/student/register` - Student registration
- `POST /api/student/login` - Student login
- `POST /api/admin/login` - Admin login
- `POST /api/admin/create` - Create admin (first-time setup)

### Student Endpoints
- `GET /api/messages/:studentId` - Get messages for student
- `POST /api/student/fcm-token` - Update FCM token

### Admin Endpoints
- `GET /api/batches` - Get all batches with student counts
- `GET /api/branches` - Get all unique branches
- `GET /api/students?batches=2023-2027&branches=CSE` - Get filtered students

## 🎮 Socket.io Events

### Client → Server
- `registerStudent` - Student connects and goes online
- `registerAdmin` - Admin connects
- `sendBatchMessage` - Admin sends message to batches
- `markDelivered` - Student marks message as delivered

### Server → Client
- `receiveMessage` - Student receives new message
- `messageSent` - Admin gets delivery confirmation
- `batchInfo` - Admin gets updated batch statistics

## 🛠️ Technology Stack

### Backend
- Node.js + Express
- Socket.io (real-time communication)
- MongoDB + Mongoose (database)
- JWT (authentication)
- bcrypt (password hashing)
- Firebase Admin SDK (push notifications)

### Frontend
- React 19
- Vite (build tool)
- Socket.io Client
- Axios (HTTP requests)
- React Toastify (notifications)
- Firebase SDK (web push)

## 📊 Features Breakdown

| Feature | Status | Description |
|---------|--------|-------------|
| Student Registration | ✅ Done | With ID, name, password, branch, years |
| Student Login | ✅ Done | JWT-based authentication |
| Admin Login | ✅ Done | HOD authentication |
| Batch Selection | ✅ Done | Multiple batches and branches |
| Student Count Display | ✅ Done | Shows total and online students |
| Real-time Messaging | ✅ Done | Instant delivery to online students |
| Offline Message Storage | ✅ Done | MongoDB persistence |
| Push Notifications | ✅ Done | Firebase Cloud Messaging |
| Message History | ✅ Done | Students see all past messages |
| Read Receipts | ❌ Not Implemented | As per requirements |
| Student Reply | ❌ Not Implemented | As per requirements (read-only) |

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB connection string in `.env`
- Ensure MongoDB is running
- Check port 5000 is not in use

### Firebase not working
- Verify Firebase credentials in `.env`
- Check Firebase console for errors
- Ensure service worker is registered

### Students not receiving messages
- Check student is registered in correct batch/branch
- Verify socket connection in browser console
- Check MongoDB for stored messages

## 📝 Future Enhancements

- 📸 Image/file attachments
- 📊 Admin analytics dashboard
- 🔍 Search in message history
- 📅 Schedule messages for later
- 👥 Student groups within batches
- 📱 Mobile app (React Native)

## 👨‍💻 Development

To run all services locally:

```powershell
# Terminal 1 - Backend
cd backend; npm start

# Terminal 2 - Student Frontend
cd parent-frontend; npm run dev

# Terminal 3 - Admin Frontend
cd caretaker-frontend; npm run dev
```

## 📄 License

ISC

## 🤝 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for College Communication**

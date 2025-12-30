# Quick Start Guide - WhatsApp Clone for College

## 🎯 What This System Does

This is a college messaging system where:
- **Students** register with their batch years (e.g., 2023-2027) and branch (CSE, ECE, etc.)
- **HOD (Admin)** can select specific batches and branches
- **Messages** go to all students in selected batches/branches
- **Online students** get messages instantly
- **Offline students** get push notifications and messages saved in database

## 🚀 5-Minute Setup

### Step 1: Start MongoDB
Make sure MongoDB is running on your computer.

### Step 2: Configure Backend

1. Go to `backend` folder
2. Copy `.env.example` to `.env`
3. Update MongoDB URI if needed:
   ```
   MONGODB_URI=mongodb://localhost:27017/college-messaging
   ```

### Step 3: Start Backend

```powershell
cd backend
npm install
npm start
```

You should see: "Server running on port 5000" and "Connected to MongoDB"

### Step 4: Create First Admin

Open a new PowerShell terminal and run:

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

### Step 5: Start Student Frontend

```powershell
cd parent-frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

### Step 6: Start Admin Frontend

```powershell
cd caretaker-frontend
npm install
npm run dev
```

Open: `http://localhost:5174`

## 🎓 Testing the System

### Register Students

1. Go to `http://localhost:5173`
2. Click "New Student? Register Here"
3. Create students with different batches:

**Student 1:**
- Student ID: ST2023001
- Name: John Doe
- Password: student123
- Branch: CSE
- Start Year: 2023
- End Year: 2027

**Student 2:**
- Student ID: ST2024001
- Name: Jane Smith
- Password: student123
- Branch: ECE
- Start Year: 2024
- End Year: 2028

### Login as HOD

1. Go to `http://localhost:5174`
2. Login:
   - Admin ID: HOD001
   - Password: admin123

### Send a Message

1. In HOD dashboard:
   - Select branches: CSE, ECE (check the boxes)
   - Select batches: 2023-2027, 2024-2028 (check the boxes)
   - See the count of students
   - Type a message: "Welcome to the new semester!"
   - Click "Send to X Students"

2. Check student apps - they should receive the message instantly!

## 🔥 Optional: Firebase Push Notifications

To enable push notifications for offline students:

1. Create a Firebase project at https://console.firebase.google.com/
2. Follow the Firebase setup instructions in main README.md
3. Update `backend/.env` with Firebase credentials
4. Update `parent-frontend/src/firebase.js` with your config
5. Restart backend server

## 📋 Default Test Data

Use these credentials for quick testing:

**Admin:**
- ID: HOD001
- Password: admin123

**Students (after registration):**
- ID: ST2023001, Password: student123, Batch: 2023-2027, Branch: CSE
- ID: ST2024001, Password: student123, Batch: 2024-2028, Branch: ECE

## 🐛 Common Issues

**"MongoDB connection failed"**
- Make sure MongoDB is running
- Check the connection string in backend/.env

**"Port 5000 already in use"**
- Stop the old backend process
- Or change PORT in .env to 5001

**"Cannot connect to backend"**
- Make sure backend is running on port 5000
- Check browser console for errors

**"Students not showing up in HOD dashboard"**
- Students need to be registered first
- Refresh the HOD dashboard

## 🎮 Quick Commands Reference

```powershell
# Start Backend
cd backend; npm start

# Start Student App
cd parent-frontend; npm run dev

# Start Admin App
cd caretaker-frontend; npm run dev

# Create Admin via API
curl -X POST http://localhost:5000/api/admin/create -H "Content-Type: application/json" -d '{"adminId":"HOD001","name":"Dr. Admin","password":"admin123","department":"CSE"}'
```

## ✅ Success Checklist

- [ ] MongoDB is running
- [ ] Backend shows "Connected to MongoDB"
- [ ] Backend shows "Server running on port 5000"
- [ ] Admin created successfully
- [ ] Student app accessible at localhost:5173
- [ ] Admin app accessible at localhost:5174
- [ ] Students can register
- [ ] Students can login
- [ ] Admin can login
- [ ] Admin can see batches
- [ ] Messages are delivered in real-time

## 📞 Next Steps

Once everything works:

1. Register multiple students in different batches
2. Test batch filtering
3. Test branch filtering
4. Check message history for students
5. Test online/offline message delivery
6. Set up Firebase for push notifications (optional)

Enjoy your college messaging system! 🎉

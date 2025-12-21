# Push Notifications & Badge Count Setup Guide

## ✅ What's Been Implemented

### 1. Backend Changes (server.js)
- **NEW: FCM Token Registration Endpoint** (`POST /api/fcm-token`)
  - Students can register multiple FCM tokens (web + Android)
  - Tokens stored in `fcmTokens` array in Student model
  
- **UPDATED: Push Notification Function** (`sendPushNotificationToStudent`)
  - Now sends to ALL registered devices (web + Android)
  - Calculates unread message count for badge
  - Badge count passed to Firebase Cloud Messaging

### 2. Firebase Service Worker (firebase-messaging-sw.js)
- **FIXED: Added real Firebase config** (was using placeholders)
- Badge count included in background notifications
- Handles notifications when app is closed

### 3. Frontend Already Has (StudentChat.jsx + firebaseConfig.js)
- ✅ Requests notification permission on login
- ✅ Gets FCM token from Firebase
- ✅ Sends token to backend at `/api/fcm-token`
- ✅ Listens for foreground messages

---

## 🚀 Next Steps to Enable Notifications

### Step 1: Deploy Backend to Render
```bash
# Make sure you're in backend folder
cd backend

# Commit all changes
git add .
git commit -m "Added FCM token registration and badge counts"
git push origin main
```
- Render will auto-deploy from GitHub
- Check logs at: https://dashboard.render.com

### Step 2: Deploy Frontend to Netlify
```bash
# Make sure you're in parent-frontend folder
cd parent-frontend

# Build the project
npm run build

# Commit changes
git add .
git commit -m "Updated Firebase service worker with real config"
git push origin main
```
- Netlify will auto-deploy
- Or manually drag the `dist` folder to Netlify

### Step 3: Test on Website First
1. Open your website: https://your-netlify-url.netlify.app
2. Login as a student
3. **Check browser console** for:
   - "Notification permission granted."
   - "FCM Token: ..." (long string)
4. Open a second browser (incognito mode)
5. Login as HOD and send a message
6. You should see a notification!

### Step 4: Fix Median.co Package Name Issue
**CRITICAL:** Your google-services.json has wrong package name!

1. Go to Firebase Console: https://console.firebase.google.com/project/chtting-fa0db
2. Click **Project Settings** (gear icon)
3. Scroll to **Your apps** section
4. Click **Add app** → Select **Android**
5. **IMPORTANT:** Enter package name: `co.median.android.zppakdj` (from your Median app)
6. Click **Register app**
7. Download the **NEW google-services.json** file
8. Upload this file to Median.co

> **Why?** Your current google-services.json has package name `co.median.android.xlimzm` but your Median app uses `co.median.android.zppakdj`. They must match!

### Step 5: Enable Notifications in Median.co
1. Go to Median.co dashboard
2. Upload the **NEW google-services.json** (from Step 4)
3. Enable **Push Notifications** in Settings
4. Build Android APK
5. Download and install on your phone

### Step 6: Test on Android App
1. Open the app and register/login
2. **First time:** App should ask for notification permission - ALLOW IT
3. Close the app completely (swipe from recent apps)
4. From another device, login as HOD and send a message
5. You should get:
   - ✅ Notification on lock screen
   - ✅ Badge count on app icon (unread messages)
   - ✅ Vibration

---

## 🔧 Troubleshooting

### Issue: Not asking for notification permission
**Solution:** This only happens on first login. Try these:
1. Clear browser data / uninstall and reinstall app
2. Check browser console for errors
3. Make sure you're on HTTPS (not HTTP)

### Issue: Notifications not showing
**Checklist:**
- [ ] Backend deployed with new code
- [ ] Frontend deployed with firebase-messaging-sw.js
- [ ] Browser/app permission granted
- [ ] FCM token registered (check console logs)
- [ ] Student is offline when message sent
- [ ] No errors in browser/app console

### Issue: Badge count not showing
**Android specific:**
- Some Android launchers don't support badges (Samsung, OnePlus work well)
- Badge shows TOTAL unread messages, not just new ones
- Badge clears when you open the app and read messages

### Issue: google-services.json upload fails
**Error:** "Package name mismatch"
**Solution:** Follow Step 4 above to create new Firebase Android app with correct package name

---

## 📱 How Badge Count Works

### Backend Logic:
```javascript
// When sending notification, count unread messages
const unreadCount = await Message.countDocuments({
  recipients: {
    $elemMatch: {
      studentId: student.studentId,
      delivered: false
    }
  }
});

// Send with badge count
await sendPushNotification(
  fcmToken,
  'New message from HOD',
  messageText,
  { messageId, type: 'batch_message' },
  unreadCount || 1  // Badge count
);
```

### Firebase Config:
```javascript
// Android
notification: {
  android: {
    notificationCount: badgeCount  // Shows on app icon
  }
}

// iOS
apns: {
  payload: {
    aps: {
      badge: badgeCount  // Shows on app icon
    }
  }
}
```

---

## 🎯 API Endpoints

### Register FCM Token
```http
POST /api/fcm-token
Content-Type: application/json

{
  "studentId": "22K61A0501",
  "fcmToken": "fH8xK9L..."  // From Firebase
}

Response:
{
  "success": true,
  "message": "FCM token registered successfully"
}
```

### Send Message (existing)
```http
POST /api/messages/send
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "senderId": "hod123",
  "message": "Classes postponed",
  "batches": ["2022-2026"],
  "branches": ["CSE"],
  "section": "A"
}
```

---

## 📊 Testing Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Netlify
- [ ] Website notifications working
- [ ] Firebase Android app created with correct package name
- [ ] NEW google-services.json uploaded to Median
- [ ] Android app built and installed
- [ ] Permission asked on first login
- [ ] Notification shows when app closed
- [ ] Badge count shows correct number
- [ ] Badge clears when messages read

---

## 🔑 Important Files

- `backend/server.js` - FCM token endpoint and notification logic
- `backend/firebase-config.js` - Firebase Admin SDK (sends notifications)
- `parent-frontend/src/firebaseConfig.js` - Firebase Web SDK (receives notifications)
- `parent-frontend/src/StudentChat.jsx` - Registers FCM token on login
- `parent-frontend/public/firebase-messaging-sw.js` - Background notifications

---

## 💡 Tips

1. **Test on website first** before moving to Android app
2. **Use Chrome DevTools** → Application → Service Workers to debug
3. **Check Firebase Console** → Cloud Messaging for sent message stats
4. **Android logs:** Use `adb logcat` to see push notification logs
5. **Badge persistence:** Badge count is set by backend, not automatically updated by app

---

Need help? Check these logs:
- Backend: Render dashboard logs
- Frontend: Browser console (F12)
- Android: `adb logcat | grep FCM`

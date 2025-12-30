# 🔔 Push Notification Testing Guide

## Current Setup Summary

✅ **Token Registration Flow:**
1. Student logs in → Opens chat
2. App requests notification permission
3. Gets FCM token from Firebase
4. Sends token to backend `/api/fcm-token`
5. Backend saves token in `fcmTokens` array

✅ **Online/Offline Detection:**
1. Student opens app → Socket connects → `isOnline = true`
2. Student closes app → Socket disconnects → `isOnline = false`

✅ **Message Delivery Logic:**
1. Admin sends message
2. For each target student:
   - If **ONLINE** (socket connected) → Send via Socket.IO (in-app message)
   - If **OFFLINE** (no socket) → Send push notification via Firebase

✅ **Multiple Devices:**
- Each device has its own FCM token
- All tokens stored in `fcmTokens` array
- Notifications sent to ALL offline devices

---

## 🧪 Testing Steps

### Step 1: Check Current Tokens in Database
```bash
cd backend
node check-tokens.js
```
**Expected Output:**
- Shows all students with FCM tokens
- Should show student ID 4333 (Sameer) with 2 tokens

### Step 2: Test Direct Notification
```bash
node test-fcm-direct.js
```
**Expected Output:**
- ✅ Notification sent successfully
- Check your device with that FCM token for notification

### Step 3: Deploy Frontend with Updated Code
```bash
cd ../parent-frontend
npm run build
# Deploy dist folder to Netlify
```

### Step 4: Test Token Registration Flow

**A. Open Student App:**
1. Go to https://your-netlify-url.netlify.app
2. Open browser console (F12)
3. Login as student ID: **4333**, password: **your-password**

**B. Watch Console Logs:**
```
📱 Student logged in, initializing FCM...
🔔 Requesting notification permission...
Permission status: granted
✅ Notification permission granted.
✅ Service Worker ready
📱 Getting FCM token...
✅ FCM Token received: fo2BeiJ3S0aG3ExWX...
📤 Sending FCM token to backend...
✅ FCM token registered with backend: { success: true, ... }
🔌 Socket connected, student registered as ONLINE
```

**C. Check Backend Logs (Render):**
```
📱 FCM token registration request from student: 4333
✅ FCM token registered for student 4333 (Total tokens: 3)
   Token: fo2BeiJ3S0aG3ExWXCHhby:APA...
🔌 Student 4333 connected (Socket ID: abc123)
✅ Student 4333 is now ONLINE (has 3 FCM tokens)
```

### Step 5: Test Message Delivery

**A. Student ONLINE (Socket Connected):**
1. Keep student app OPEN
2. Open admin app → Login as HOD001
3. Send message to Batch: 2023-2027, Branch: CSE
4. **Expected:** Student sees message immediately (NO notification)
5. **Backend Log:** "Message sent: 1 online, 0 offline"

**B. Student OFFLINE (App Closed):**
1. **CLOSE the student app** (or disconnect from internet)
2. Wait 5 seconds for socket to disconnect
3. From admin app, send another message
4. **Expected:** 
   - Push notification appears on device
   - Badge count shows unread messages
5. **Backend Logs:**
```
❌ Student 4333 is now OFFLINE
📤 Sending push notification to 4333 (3 devices, 2 unread)
✅ Notification sent to 4333 (token: fo2BeiJ3S0aG...)
✅ Notification sent to 4333 (token: fo2BeiJ3S0aG...)
✅ Notification sent to 4333 (token: fo2BeiJ3S0aG...)
```

### Step 6: Test Multiple Devices

**A. Setup:**
1. Device 1: Open student app (keep OPEN)
2. Device 2: Close student app (OFFLINE)

**B. Send Message:**
- Device 1: Gets message via socket (in-app)
- Device 2: Gets push notification

**C. Backend Logic:**
```javascript
// Check if student has socket connection
if (connectedStudents[studentId]) {
  // Send via socket (device is online)
  io.to(socketId).emit("receiveMessage", {...});
} else {
  // Send push notification (device is offline)
  sendPushNotificationToStudent(student, message);
}
```

---

## 🐛 Troubleshooting

### Issue: No FCM token in console
**Possible Causes:**
1. Service worker not registered
2. Permission denied
3. HTTPS not enabled (Firebase requires HTTPS)

**Solution:**
- Check service worker: Open DevTools → Application → Service Workers
- Check permission: `Notification.permission` should be "granted"
- Use HTTPS or localhost (not HTTP)

### Issue: Token not saved to database
**Check:**
1. Backend logs: Should show "FCM token registered"
2. Network tab: Check `/api/fcm-token` request
3. Response: Should be `{ success: true }`

**Common Errors:**
- 404: Backend not deployed
- 400: Missing studentId or fcmToken
- 404: Student not found (register first)

### Issue: Notification not received
**Checklist:**
- [ ] Student is OFFLINE (socket disconnected)
- [ ] FCM token saved in database
- [ ] Firebase credentials configured in backend
- [ ] Message sent to correct batch/branch
- [ ] Device has internet connection
- [ ] Notification permission granted

### Issue: Notification received when app is OPEN
**Problem:** Socket connection logic issue

**Check:**
- Is socket properly connected?
- Is `isOnline` status updated?
- Backend logs should show "Student X is now ONLINE"

---

## 📊 Testing Checklist

- [ ] Student can login successfully
- [ ] Notification permission requested after login
- [ ] FCM token saved to database
- [ ] Socket connection established (online status)
- [ ] Message delivered via socket when ONLINE
- [ ] Socket disconnects when app closed
- [ ] Offline status updated in database
- [ ] Push notification sent when OFFLINE
- [ ] Badge count shows unread messages
- [ ] Multiple devices work independently
- [ ] Token updated if device reinstalled

---

## 🔍 Debug Commands

### Check Database Tokens
```bash
cd backend
node check-tokens.js
```

### Test Specific Token
```bash
# Edit test-fcm-direct.js with your token
node test-fcm-direct.js
```

### Add Token Manually
```bash
# Edit add-test-token.js with your token
node add-test-token.js
```

### Watch Backend Logs
```bash
# Render dashboard
https://dashboard.render.com/web/YOUR-SERVICE-ID/logs
```

### Watch Frontend Console
```
F12 → Console tab
Filter: FCM, notification, socket
```

---

## ✅ Success Indicators

**Frontend Console:**
```
✅ FCM Token received
✅ FCM token registered with backend
🔌 Socket connected, student registered as ONLINE
```

**Backend Logs:**
```
✅ FCM token registered for student X (Total tokens: Y)
🔌 Student X connected
✅ Student X is now ONLINE (has Y FCM tokens)
```

**When Message Sent (Online):**
```
Frontend: Message appears immediately
Backend: "Message sent: X online, 0 offline"
```

**When Message Sent (Offline):**
```
Device: Push notification appears
Backend: "📤 Sending push notification to X..."
Backend: "✅ Notification sent to X"
```

---

## 🚀 Next Steps

1. Wait for Render deployment (2-3 minutes)
2. Test token registration on frontend
3. Verify tokens in database
4. Test online message delivery
5. Test offline notification delivery
6. Test multiple devices
7. Deploy to production!

**Current Token for Testing:**
```
fo2BeiJ3S0aG3ExWXCHhby:APA91bFOYs0E1bWUzOuWZ0nkM9VI55kRV5Gt-Gg-K3KPu7djqKhnhBa-c8J6ozngwOfZ58tQYo_N-Ws5BPVF8nAObdPorrXFp6grElKlOD0Zz3WeN7Jh5RU
```

This token is already added to student 4333 (Sameer) in the database.

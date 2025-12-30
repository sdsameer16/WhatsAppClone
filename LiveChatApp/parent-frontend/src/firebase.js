// Firebase client-side configuration for web push notifications
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project
// 3. Go to Project Settings
// 4. Scroll to "Your apps" section
// 5. Click the web icon (</>)  to add a web app
// 6. Register your app and copy the config object
// 7. Replace the config below with your actual Firebase config
// 8. For Cloud Messaging, go to Cloud Messaging tab
// 9. Copy the "Web Push certificates" VAPID key
// 10. Replace VAPID_KEY below

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBBpcfHZHVciC-ZM7srN264ncgMtRMqvoU",
  authDomain: "chtting-fa0db.firebaseapp.com",
  projectId: "chtting-fa0db",
  storageBucket: "chtting-fa0db.firebasestorage.app",
  messagingSenderId: "638820938018",
  appId: "1:638820938018:web:c8a54ace46c499be6cf57b",
  measurementId: "G-09DLBSS18N"
};

// VAPID key for web push
const VAPID_KEY = "BC1GODYUCX5Xh2gd18vv4NeL84eJ1HYqURICBOqbRmRQSpoQsE3ieHRSKVvZzFQzZLZvKITr6Jmsggck7akPNTg";

let app;
let messaging;

export const initializeFirebaseClient = () => {
  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      messaging = getMessaging(app);
      console.log('✅ Firebase client initialized');
    }
    return messaging;
  } catch (error) {
    console.error('❌ Firebase client initialization failed:', error);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const getFCMToken = async () => {
  try {
    const messaging = initializeFirebaseClient();
    
    if (!messaging) {
      console.log('Firebase messaging not initialized');
      return null;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (currentToken) {
      console.log('✅ FCM Token obtained:', currentToken.substring(0, 20) + '...');
      return currentToken;
    } else {
      console.log('❌ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = initializeFirebaseClient();
    
    if (!messaging) {
      return;
    }

    onMessage(messaging, (payload) => {
      console.log('📩 Message received:', payload);
      resolve(payload);
    });
  });

export default { 
  initializeFirebaseClient, 
  requestNotificationPermission, 
  getFCMToken, 
  onMessageListener 
};

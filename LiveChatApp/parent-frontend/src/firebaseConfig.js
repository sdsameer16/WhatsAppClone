// Firebase Configuration for Web Push Notifications
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDoRVuByteElV-7McGuCu1k28Jigp4XO8g",
  authDomain: "chtting-fa0db.firebaseapp.com",
  projectId: "chtting-fa0db",
  storageBucket: "chtting-fa0db.firebasestorage.app",
  messagingSenderId: "638820938018",
  appId: "1:638820938018:web:c8a54ace46c499be6cf57b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.log("Firebase messaging not supported in this browser");
}

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.log("Messaging not initialized");
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: 'BC1GODYUCX5Xh2gd18vv4NeL84eJ1HYqURICBOqbRmRQSpoQsE3ieHRSKVvZzFQzZLZvKITr6Jmsggck7akPNTg'
      });
      
      if (token) {
        console.log('FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      resolve(payload);
    });
  });

export { messaging };

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
    // PRIORITY 1: Check if running in Android WebView with bridge
    if (window.AndroidBridge && typeof window.AndroidBridge.getFCMToken === 'function') {
      console.log('🤖 Running in Android WebView with bridge');
      const nativeToken = window.AndroidBridge.getFCMToken();
      if (nativeToken && nativeToken.length > 0) {
        console.log('✅ Using native FCM token from Android:', nativeToken.substring(0, 30) + '...');
        // Only call log if it exists
        if (typeof window.AndroidBridge.log === 'function') {
          window.AndroidBridge.log('FCM token retrieved: ' + nativeToken.substring(0, 30) + '...');
        }
        return nativeToken;
      }
    }

    // PRIORITY 2: Check if token was injected by Android
    if (window.AndroidFCMToken && window.AndroidFCMToken.length > 0) {
      console.log('🤖 Using injected Android FCM token');
      console.log('✅ Android Token:', window.AndroidFCMToken.substring(0, 30) + '...');
      return window.AndroidFCMToken;
    }

    // PRIORITY 3: Web browser flow (for desktop/mobile web)
    if (!messaging) {
      console.log("❌ Messaging not initialized - not in web browser");
      console.log("⚠️ If in Android app, make sure JavaScript bridge is set up");
      return null;
    }

    console.log("🌐 Running in web browser, using Firebase Web SDK");
    
    // Request permission
    const permission = await Notification.requestPermission();
    console.log(`Permission status: ${permission}`);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted.');
      
      // Wait for service worker to be ready
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready:', registration);
      }
      
      // Get FCM token
      console.log('📱 Getting FCM token from Firebase...');
      const token = await getToken(messaging, {
        vapidKey: 'BC1GODYUCX5Xh2gd18vv4NeL84eJ1HYqURICBOqbRmRQSpoQsE3ieHRSKVvZzFQzZLZvKITr6Jmsggck7akPNTg'
      });
      
      if (token) {
        console.log('✅ Web FCM Token received:', token.substring(0, 30) + '...');
        return token;
      } else {
        console.log('❌ No registration token available.');
        return null;
      }
    } else {
      console.log('❌ Unable to get permission to notify. Permission:', permission);
      return null;
    }
  } catch (error) {
    console.error('❌ An error occurred while retrieving token:', error);
    
    // Last resort: Try Android fallbacks
    if (window.AndroidBridge && typeof window.AndroidBridge.getFCMToken === 'function') {
      console.log('⚠️ Error with web SDK, trying Android bridge as fallback');
      const fallbackToken = window.AndroidBridge.getFCMToken();
      if (fallbackToken) {
        return fallbackToken;
      }
    }
    
    if (window.AndroidFCMToken) {
      console.log('⚠️ Error with web SDK, using injected Android token as fallback');
      return window.AndroidFCMToken;
    }
    
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

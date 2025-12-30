// Firebase Cloud Messaging Configuration
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select existing project
// 3. Go to Project Settings > Service Accounts
// 4. Click "Generate New Private Key" and download the JSON file
// 5. Save the JSON file as "firebase-service-account.json" in backend folder
// 6. Add to .gitignore to keep it secure
// 7. For web push notifications, go to Cloud Messaging tab
// 8. Copy the "Web Push certificates" key pair
// 9. Add the credentials to .env file

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseInitialized = false;

export const initializeFirebase = () => {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Option 1: Using service account JSON file
    // Uncomment this if you have the service account JSON file
    /*
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    */

    // Option 2: Using environment variables (recommended for production)
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase initialized successfully');
    } else {
      console.log('⚠️ Firebase not initialized - missing environment variables');
      console.log('Add Firebase credentials to .env file:');
      console.log('FIREBASE_PROJECT_ID=your-project-id');
      console.log('FIREBASE_CLIENT_EMAIL=your-client-email');
      console.log('FIREBASE_PRIVATE_KEY=your-private-key');
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
  }
};

export const sendPushNotification = async (fcmToken, title, body, data = {}, badgeCount = 1) => {
  if (!firebaseInitialized) {
    console.log('Firebase not initialized, skipping push notification');
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: fcmToken,
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#f5576c',
          sound: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          notificationCount: badgeCount, // Badge count for Android
        },
      },
      apns: {
        payload: {
          aps: {
            badge: badgeCount, // Badge count for iOS
            sound: 'default',
          },
        },
      },
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/badge.png',
          vibrate: [200, 100, 200],
          tag: 'student-message', // Group notifications
          renotify: true,
        },
        fcmOptions: {
          link: '/',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendBatchNotifications = async (tokens, title, body, data = {}) => {
  if (!firebaseInitialized) {
    console.log('Firebase not initialized, skipping batch notifications');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!tokens || tokens.length === 0) {
    return { success: false, error: 'No tokens provided' };
  }

  try {
    const message = {
      notification: {
        title,
        body: body.substring(0, 100), // Limit body length
      },
      data,
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/badge.png',
          vibrate: [200, 100, 200],
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message,
    });

    console.log(`✅ Batch notifications sent: ${response.successCount}/${tokens.length}`);
    
    if (response.failureCount > 0) {
      console.log(`⚠️ Failed notifications: ${response.failureCount}`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log(`Token ${idx} failed:`, resp.error);
        }
      });
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('❌ Error sending batch notifications:', error);
    return { success: false, error: error.message };
  }
};

export default admin;

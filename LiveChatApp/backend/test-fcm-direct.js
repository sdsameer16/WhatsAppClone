// Direct FCM Token Test
// This will send a notification directly to a specific FCM token
import { initializeFirebase, sendPushNotification } from './firebase-config.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase
initializeFirebase();

const testToken = 'fo2BeiJ3S0aG3ExWXCHhby:APA91bFOYs0E1bWUzOuWZ0nkM9VI55kRV5Gt-Gg-K3KPu7djqKhnhBa-c8J6ozngwOfZ58tQYo_N-Ws5BPVF8nAObdPorrXFp6grElKlOD0Zz3WeN7Jh5RU';

async function testNotification() {
  console.log('🚀 Testing FCM notification...');
  console.log('Token:', testToken.substring(0, 30) + '...');
  console.log('');

  try {
    const result = await sendPushNotification(
      testToken,
      '🔔 Test Notification',
      'This is a test push notification from your WhatsApp Clone backend!',
      {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      5 // Badge count
    );

    if (result.success) {
      console.log('✅ Notification sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.log('❌ Failed to send notification');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log(error);
  }
}

testNotification();

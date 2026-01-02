// Firebase service worker for background notifications

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyDoRVuByteElV-7McGuCu1k28Jigp4XO8g",
  authDomain: "chtting-fa0db.firebaseapp.com",
  projectId: "chtting-fa0db",
  storageBucket: "chtting-fa0db.firebasestorage.app",
  messagingSenderId: "638820938018",
  appId: "1:638820938018:web:c8a54ace46c499be6cf57b"
});

// Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  console.log('[SW] ========== BACKGROUND MESSAGE RECEIVED ==========');
  console.log('[SW] Full payload:', JSON.stringify(payload, null, 2));

  const notificationTitle = payload.notification?.title || payload.data?.title || "New Message";
  const notificationBody = payload.notification?.body || payload.data?.body || "";
  
  console.log('[SW] Notification title:', notificationTitle);
  console.log('[SW] Notification body:', notificationBody);

  // Increment badge count in localStorage
  try {
    // Get current count from localStorage
    let currentCount = parseInt(localStorage.getItem('unreadCount') || '0');
    currentCount++;
    localStorage.setItem('unreadCount', currentCount.toString());
    console.log(`[SW] Badge count incremented to: ${currentCount}`);
    
    // Try to notify the main app
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'INCREMENT_BADGE',
          count: currentCount
        });
        console.log('[SW] Sent INCREMENT_BADGE message to client');
      });
    });
  } catch (e) {
    console.error('[SW] Failed to update badge count:', e);
  }

  const notificationOptions = {
    body: notificationBody,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data || {},
    tag: payload.data?.messageId || 'default',
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  console.log('[SW] Showing notification with options:', notificationOptions);

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

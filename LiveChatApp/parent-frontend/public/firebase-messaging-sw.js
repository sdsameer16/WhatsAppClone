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
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: '/logo192.png',
    badge: '/logo192.png'
  };

  self.registration.showNotification(
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

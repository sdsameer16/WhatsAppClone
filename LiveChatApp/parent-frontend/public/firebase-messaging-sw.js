// Register service worker for Firebase Cloud Messaging
// This file should be placed in the public folder

// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDoRVuByteElV-7McGuCu1k28Jigp4XO8g",
  authDomain: "chtting-fa0db.firebaseapp.com",
  projectId: "chtting-fa0db",
  storageBucket: "chtting-fa0db.firebasestorage.app",
  messagingSenderId: "638820938018",
  appId: "1:638820938018:web:c8a54ace46c499be6cf57b"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: payload.data?.badgeCount || 1,  // Badge count for unread messages
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Open the app when notification is clicked
  event.waitUntil(
    clients.openWindow('/')
  );
});

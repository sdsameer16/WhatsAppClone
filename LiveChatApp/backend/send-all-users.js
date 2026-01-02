// send-all-users.js
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const msg = {
  notification: {
    title: "Test to all_users",
    body: "Server test message",
  },
  topic: "all_users",
};

admin
  .messaging()
  .send(msg)
  .then((res) => console.log("Sent:", res))
  .catch((err) => console.error("Error:", err));
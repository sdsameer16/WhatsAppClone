// send-branch-batch.js
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const topic = "branch_cse_batch_2023-2027"; // CSE, 2023-2027
const msg = {
  notification: {
    title: "Test to CSE 2023-2027",
    body: "Server test message to branch/batch topic",
  },
  topic,
};

admin
  .messaging()
  .send(msg)
  .then((res) => console.log("Sent:", res))
  .catch((err) => console.error("Error:", err));
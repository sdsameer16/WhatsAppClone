// ...existing code...
// ==================== ADMIN SEND NOTICE ROUTE ====================
// Send notification to Branch and/or Batch topic
const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/send-notice", async (req, res) => {
  try {
    const { branch, batches, title, body } = req.body;
    if (!title || !body || (!branch && (!batches || batches.length === 0))) {
      return res.status(400).json({ error: "Title, body, and at least branch or batches are required" });
    }

    // Build topic(s)
    let topics = [];
    if (branch) {
      topics.push(`Branch_${branch}`);
    }
    if (batches && Array.isArray(batches)) {
      batches.forEach(batch => topics.push(`Batch_${batch}`));
    }

    // Send to each topic
    let results = [];
    for (const topic of topics) {
      const message = {
        data: {
          title,
          body,
          badge: "1"
        },
        topic
      };
      try {
        const response = await admin.messaging().send(message);
        results.push({ topic, success: true, response });
      } catch (error) {
        results.push({ topic, success: false, error: error.message });
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory using ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin (ENV first, then file)
if (!admin.apps.length) {
  try {
    const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    let envPrivateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

    if (envPrivateKey) {
      envPrivateKey = envPrivateKey.replace(/\\n/g, '\n');
    }

    if (envProjectId && envClientEmail && envPrivateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: envProjectId,
          clientEmail: envClientEmail,
          privateKey: envPrivateKey,
        }),
      });
      console.log('✅ Firebase Admin initialized from environment variables');
    } else {
      // Fallback: attempt to read local serviceAccountKey.json
      try {
        const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
        });
        console.log('✅ Firebase Admin initialized from serviceAccountKey.json');
      } catch (fileErr) {
        console.warn('⚠️ Firebase Admin not initialized (no ENV creds and no serviceAccountKey.json). Push notifications will be disabled.');
      }
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
  }
}
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import xlsx from "xlsx";
import Student from "./models/Student.js";
import Admin from "./models/Admin.js";
import Message from "./models/Message.js";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { initializeFirebase, sendPushNotification, sendBatchNotifications } from "./firebase-config.js";

dotenv.config();

// Initialize Firebase only if Admin SDK isn't already initialized
if (!admin.apps.length) {
  initializeFirebase();
}



// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const server = http.createServer(app);

mongoose.connect(
  process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((error) => {
  console.log("MongoDB connection failed:", error.message);
  console.log("Server will start without database connectivity");
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    features: {
      xlsx: typeof xlsx !== 'undefined',
      multer: typeof multer !== 'undefined',
      uploadEndpoint: true
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
  console.log("WhatsApp Clone - College Batch Messaging System");
});

// Socket.IO server
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let connectedStudents = {}; // { studentId: socketId }
let adminSocket = null;

// ==================== AUTHENTICATION ROUTES ====================

// Student Registration
app.post("/api/student/register", async (req, res) => {
  try {
    const { studentId, name, mobileNumber, password, branch, startYear, endYear } = req.body;

    // Validation
    if (!studentId || !name || !mobileNumber || !password || !branch || !startYear || !endYear) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if student already exists (by studentId or mobile number)
    const existingStudent = await Student.findOne({ 
      $or: [{ studentId }, { mobileNumber }] 
    });
    if (existingStudent) {
      if (existingStudent.studentId === studentId) {
        return res.status(400).json({ error: "Student ID already exists" });
      }
      if (existingStudent.mobileNumber === mobileNumber) {
        return res.status(400).json({ error: "Mobile number already registered" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new student
    const student = new Student({
      studentId,
      name,
      mobileNumber,
      password: hashedPassword,
      branch: branch.toUpperCase(),
      startYear: parseInt(startYear),
      endYear: parseInt(endYear),
    });

    await student.save();

    // Generate JWT token
    const token = jwt.sign(
      { studentId: student.studentId, mobileNumber: student.mobileNumber, role: "student" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      student: {
        studentId: student.studentId,
        name: student.name,
        mobileNumber: student.mobileNumber,
        branch: student.branch,
        batch: student.batch,
        section: student.section,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Student Login (supports both studentId and mobile number)
app.post("/api/student/login", async (req, res) => {
  try {
    const { studentId, mobileNumber, password } = req.body;

    if ((!studentId && !mobileNumber) || !password) {
      return res.status(400).json({ error: "Student ID/Mobile number and password are required" });
    }

    // Find student by studentId or mobile number
    const student = await Student.findOne({ 
      $or: [{ studentId }, { mobileNumber }] 
    });
    if (!student) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, student.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last seen
    student.lastSeen = new Date();
    await student.save();

    // Generate JWT token
    const token = jwt.sign(
      { studentId: student.studentId, mobileNumber: student.mobileNumber, role: "student" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      student: {
        studentId: student.studentId,
        name: student.name,
        mobileNumber: student.mobileNumber,
        branch: student.branch,
        batch: student.batch,
        section: student.section,
        startYear: student.startYear,
        endYear: student.endYear,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({ error: "Admin ID and password are required" });
    }

    // Find admin
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin.adminId, role: "admin" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      admin: {
        adminId: admin.adminId,
        name: admin.name,
        role: admin.role,
        department: admin.department,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});
// Register FCM token for push notifications
app.post("/api/fcm-token", async (req, res) => {
  try {
    const { studentId, fcmToken, branch, batch, batches } = req.body;

    console.log(`📱 FCM token registration request from student: ${studentId}`);

    // Prefer explicit batch; otherwise fall back to first item in batches array (frontend sends batches)
    const resolvedBatch = batch || (Array.isArray(batches) && batches.length > 0 ? batches[0] : null);

    if (!studentId || !fcmToken || !branch || !resolvedBatch) {
      console.log("❌ Missing studentId, fcmToken, branch, or batch");
      return res.status(400).json({ error: "Student ID, FCM token, branch, and batch are required" });
    }

    // Find student and add token if not already present
    const student = await Student.findOne({ studentId });
    if (!student) {
      console.log(`❌ Student ${studentId} not found in database`);
      return res.status(404).json({ error: "Student not found" });
    }

    // Add token only if it doesn't exist
    if (!student.fcmTokens.includes(fcmToken)) {
      student.fcmTokens.push(fcmToken);
      // Update branch and batch if changed
      student.branch = branch;
      student.batch = resolvedBatch;
      await student.save();
      console.log(`✅ FCM token registered for student ${studentId} (Total tokens: ${student.fcmTokens.length})`);
      console.log(`   Token: ${fcmToken.substring(0, 30)}...`);

      // Subscribe token to combined topic
      try {
        const normalizedBranch = branch.replace(/\s+/g, "_").toLowerCase();
        const normalizedBatch = resolvedBatch.replace(/\s+/g, "_").toLowerCase();
        const combinedTopic = `branch_${normalizedBranch}_batch_${normalizedBatch}`;
        await admin.messaging().subscribeToTopic([fcmToken], combinedTopic);
        console.log(`✅ Token subscribed to topic: ${combinedTopic}`);
      } catch (topicError) {
        console.error(`⚠️  Failed to subscribe to topic:`, topicError.message);
        // Continue even if topic subscription fails
      }
    } else {
      console.log(`ℹ️  Token already exists for student ${studentId}`);
    }

    res.json({ 
      success: true, 
      message: "FCM token registered and subscribed to combined topic",
      tokenCount: student.fcmTokens.length 
    });
  } catch (error) {
    console.error("❌ FCM token registration error:", error);
    res.status(500).json({ error: "Failed to register FCM token", details: error.message });
  }
});
// Create default admin (for first time setup)
app.post("/api/admin/create", async (req, res) => {
  try {
    const { adminId, name, password, department } = req.body;

    if (!adminId || !name || !password || !department) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ adminId });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin ID already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const admin = new Admin({
      adminId,
      name,
      password: hashedPassword,
      department: department.toUpperCase(),
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
    });
  } catch (error) {
    console.error("Admin creation error:", error);
    res.status(500).json({ error: "Admin creation failed" });
  }
});

// ==================== BATCH & STUDENT INFO ROUTES ====================

// Get all batches with student counts
app.get("/api/batches", async (req, res) => {
  try {
    const { branch } = req.query;

    const matchFilter = branch ? { branch: branch.toUpperCase() } : {};

    const batches = await Student.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { batch: "$batch", branch: "$branch" },
          count: { $sum: 1 },
          students: {
            $push: {
              studentId: "$studentId",
              name: "$name",
              isOnline: "$isOnline",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          batch: "$_id.batch",
          branch: "$_id.branch",
          studentCount: "$count",
          students: 1,
        },
      },
      { $sort: { batch: -1, branch: 1 } },
    ]);

    res.json(batches);
  } catch (error) {
    console.error("Error fetching batches:", error);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

// Get all unique branches
app.get("/api/branches", async (req, res) => {
  try {
    const branches = await Student.distinct("branch");
    res.json(branches.sort());
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ error: "Failed to fetch branches" });
  }
});

// Get students by batch and branch
app.get("/api/students", async (req, res) => {
  try {
    const { batches, branches, section } = req.query;

    const filter = {};
    if (batches) {
      filter.batch = { $in: batches.split(",") };
    }
    if (branches) {
      filter.branch = { $in: branches.split(",").map(b => b.toUpperCase()) };
    }
    if (section) {
      filter.section = section.toUpperCase();
    }

    const students = await Student.find(filter)
      .select("studentId name mobileNumber branch batch section isOnline lastSeen")
      .sort({ batch: -1, branch: 1, section: 1, name: 1 });

    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// Get all sections
app.get("/api/sections", async (req, res) => {
  try {
    const sections = await Student.distinct("section");
    res.json(sections.filter(s => s !== null));
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ error: "Failed to fetch sections" });
  }
});

// Upload Excel/CSV file to assign sections
app.post("/api/upload-sections", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", req.file.originalname, "Size:", req.file.size);

    // Parse Excel/CSV file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log("Parsed rows:", data.length);

    let updated = 0;
    let notFound = 0;
    const errors = [];

    // Expected columns: studentId, section
    // Or: mobileNumber, section
    // Or: studentId, mobileNumber, section
    for (const row of data) {
      const studentId = row.studentId || row.StudentID || row.student_id;
      const mobileNumber = row.mobileNumber || row.mobile_number || row.phone;
      const section = row.section || row.Section || row.CLASS || row.class;

      if (!section) {
        errors.push(`Missing section for row: ${JSON.stringify(row)}`);
        continue;
      }

      if (!studentId && !mobileNumber) {
        errors.push(`Missing studentId or mobileNumber for row: ${JSON.stringify(row)}`);
        continue;
      }

      // Find and update student
      const query = {};
      if (studentId) query.studentId = studentId;
      if (mobileNumber) query.mobileNumber = mobileNumber;

      const student = await Student.findOne(query);
      if (student) {
        student.section = section.toString().toUpperCase();
        await student.save();
        updated++;
      } else {
        notFound++;
        errors.push(`Student not found: ${studentId || mobileNumber}`);
      }
    }

    console.log("Upload complete - Updated:", updated, "Not found:", notFound);

    res.json({
      success: true,
      message: "Sections uploaded successfully",
      stats: {
        total: data.length,
        updated,
        notFound,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Return first 10 errors
    });
  } catch (error) {
    console.error("Error uploading sections:", error);
    res.status(500).json({ 
      error: "Failed to upload sections",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== MESSAGE ROUTES ====================

// Get all messages for admin (HOD)
app.get("/api/admin/messages", async (req, res) => {
  try {
    // Get all messages sorted by timestamp
    const messages = await Message.find({}).sort({ timestamp: -1 }).limit(500);
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching admin messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Get messages for a student
app.get("/api/messages/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student to get their batch and branch
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Find messages targeted to this student's batch and branch
    // Sort by timestamp descending (most recent first) to ensure latest messages are loaded
    const messages = await Message.find({
      targetBatches: student.batch,
      targetBranches: student.branch,
    }).sort({ timestamp: -1 }).limit(200); // Get last 200 messages

    // Reverse to show oldest first in UI
    res.json(messages.reverse());
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Mark message as delivered for a student
app.post("/api/messages/:messageId/delivered", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { studentId } = req.body;

    const message = await Message.findOne({ messageId });
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Update recipient delivery status
    const recipientIndex = message.recipients.findIndex(
      r => r.studentId === studentId
    );

    if (recipientIndex !== -1) {
      message.recipients[recipientIndex].delivered = true;
      message.recipients[recipientIndex].deliveredAt = new Date();
      await message.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking message delivered:", error);
    res.status(500).json({ error: "Failed to mark message as delivered" });
  }
});

// Update FCM token for push notifications
app.post("/api/student/fcm-token", async (req, res) => {
  try {
    const { studentId, fcmToken } = req.body;

    if (!studentId || !fcmToken) {
      return res.status(400).json({ error: "Student ID and FCM token are required" });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Store token if not already present
    if (!student.fcmTokens.includes(fcmToken)) {
      student.fcmTokens.push(fcmToken);
      await student.save();
    }

    // Subscribe token to topics
    try {
      await admin.messaging().subscribeToTopic([fcmToken], 'all_users');
      if (student.branch && student.batch) {
        const normalizedBranch = student.branch.toLowerCase().replace(/\s+/g, '_');
        const normalizedBatch = student.batch.toLowerCase().replace(/\s+/g, '_');
        const topic = `branch_${normalizedBranch}_batch_${normalizedBatch}`;
        await admin.messaging().subscribeToTopic([fcmToken], topic);
      }
    } catch (topicErr) {
      console.warn('Topic subscription failed:', topicErr.message);
    }

    res.json({ success: true, tokenCount: student.fcmTokens.length });
  } catch (error) {
    console.error("Error updating FCM token:", error);
    res.status(500).json({ error: "Failed to update FCM token" });
  }
});

// ==================== SOCKET.IO HANDLERS ====================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Student registration
  socket.on("registerStudent", async (data) => {
    const { studentId } = data;
    console.log(`🔌 Student ${studentId} connected (Socket ID: ${socket.id})`);

    connectedStudents[studentId] = socket.id;

    // Update student online status
    const student = await Student.findOneAndUpdate(
      { studentId },
      { isOnline: true, lastSeen: new Date() },
      { new: true }
    );

    if (student) {
      const tokenCount = Array.isArray(student.fcmTokens) ? student.fcmTokens.length : 0;
      console.log(`✅ Student ${studentId} is now ONLINE (has ${tokenCount} FCM token(s))`);

      // Subscribe all tokens to the student's branch/batch topic
      if (tokenCount > 0 && student.branch && student.batch) {
        try {
          const normalizedBranch = student.branch.toLowerCase().replace(/\s+/g, '_');
          const normalizedBatch = student.batch.toLowerCase().replace(/\s+/g, '_');
          const topic = `branch_${normalizedBranch}_batch_${normalizedBatch}`;
          const tokens = student.fcmTokens;
          await admin.messaging().subscribeToTopic(tokens, topic);
          console.log(`✅ Subscribed ${studentId} (${tokens.length} token(s)) to topic: ${topic}`);
        } catch (error) {
          console.error(`❌ Error subscribing to topic:`, error);
        }
      }
    }

    // Notify admin about student count update
    if (adminSocket) {
      sendBatchInfoToAdmin();
    }

    // Don't send pending messages via socket - student will load them via API
    // This prevents duplicate notifications when student reconnects
    console.log(`✅ Student ${studentId} registered. Messages will be loaded via API.`);
  });

  // Admin registration
  socket.on("registerAdmin", () => {
    adminSocket = socket.id;
    console.log("Admin connected");
    sendBatchInfoToAdmin();
  });

  // Admin sends batch message
  socket.on("sendBatchMessage", async (data) => {
    try {
      const { batches, branches, message, senderName } = data;

      console.log(`Admin sending message to batches: ${batches}, branches: ${branches}`);

      // Find all students matching the criteria
      const targetStudents = await Student.find({
        batch: { $in: batches },
        branch: { $in: branches },
      });

      if (targetStudents.length === 0) {
        socket.emit("messageSent", {
          success: false,
          error: "No students found for selected batches/branches",
        });
        return;
      }

      // Create message in database
      const newMessage = new Message({
        messageId: uuidv4(),
        sender: "admin",
        senderName,
        message,
        targetBatches: batches,
        targetBranches: branches,
        recipients: targetStudents.map(student => ({
          studentId: student.studentId,
          delivered: false,
        })),
      });

      await newMessage.save();

      // Send push notification only to the selected branches/batches
      const notificationResult = await sendPushNotificationToTopic(
        message, 
        senderName, 
        newMessage.messageId,
        branches,
        batches
      );
      
      if (!notificationResult.success) {
        console.warn('Some notifications failed to send:', notificationResult);
      }

      // Send via socket to online students for instant in-app delivery
      let onlineCount = 0;
      let offlineCount = 0;

      targetStudents.forEach(student => {
        const socketId = connectedStudents[student.studentId];
        
        if (socketId) {
          // Send via socket for instant in-app delivery
          io.to(socketId).emit("receiveMessage", {
            messageId: newMessage.messageId,
            senderName,
            message,
            timestamp: newMessage.timestamp,
          });
          onlineCount++;
        } else {
          offlineCount++;
        }
      });

      console.log(`Message sent to targeted topics (${branches.length * batches.length}) + ${onlineCount} online (socket), ${offlineCount} offline`);

      socket.emit("messageSent", {
        success: true,
        totalStudents: targetStudents.length,
        onlineCount,
        offlineCount,
      });
    } catch (error) {
      console.error("Error sending batch message:", error);
      socket.emit("messageSent", {
        success: false,
        error: "Failed to send message",
      });
    }
  });

  // Student marks message as delivered
  socket.on("markDelivered", async (data) => {
    const { messageId, studentId } = data;

    try {
      const message = await Message.findOne({ messageId });
      if (message) {
        const recipientIndex = message.recipients.findIndex(
          r => r.studentId === studentId
        );

        if (recipientIndex !== -1) {
          message.recipients[recipientIndex].delivered = true;
          message.recipients[recipientIndex].deliveredAt = new Date();
          await message.save();
        }
      }
    } catch (error) {
      console.error("Error marking delivered:", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("🔌 User disconnected:", socket.id);

    // Find and update student status
    for (const studentId in connectedStudents) {
      if (connectedStudents[studentId] === socket.id) {
        delete connectedStudents[studentId];
        await Student.findOneAndUpdate(
          { studentId },
          { isOnline: false, lastSeen: new Date() }
        );
        console.log(`❌ Student ${studentId} is now OFFLINE`);
        break;
      }
    }

    if (socket.id === adminSocket) {
      adminSocket = null;
      console.log("❌ Admin disconnected");
    }

    // Notify admin about student count update
    if (adminSocket) {
      sendBatchInfoToAdmin();
    }
  });
});

// Helper function to send batch info to admin
const sendBatchInfoToAdmin = async () => {
  if (!adminSocket) return;

  try {
    const batches = await Student.aggregate([
      {
        $group: {
          _id: { batch: "$batch", branch: "$branch" },
          count: { $sum: 1 },
          onlineCount: {
            $sum: { $cond: ["$isOnline", 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          batch: "$_id.batch",
          branch: "$_id.branch",
          studentCount: "$count",
          onlineCount: "$onlineCount",
        },
      },
      { $sort: { batch: -1, branch: 1 } },
    ]);

    io.to(adminSocket).emit("batchInfo", batches);
  } catch (error) {
    console.error("Error sending batch info:", error);
  }
};

// Helper function to send push notification to specific branch/batch topics
const sendPushNotificationToTopic = async (messageText, senderName, messageId = '', branches = [], batches = []) => {
  try {
    // If no branches or batches specified, don't send any notification
    if (branches.length === 0 || batches.length === 0) {
      console.log('No branches or batches specified for notification');
      return { success: false, error: 'No branches or batches specified' };
    }

    // Create a list of all topic combinations (branch_batch)
    const topics = [];
    branches.forEach(branch => {
      batches.forEach(batch => {
        const topic = `branch_${branch}_batch_${batch}`.replace(/\s+/g, '_').toLowerCase();
        topics.push(topic);
      });
    });

    console.log(`📤 Sending push notification to topics:`, topics);
    
    // Create the base message
    const message = {
      data: {
        title: `New Notice from ${senderName}`,
        body: messageText.substring(0, 150),
        messageId: messageId || '',
        badge: '',
        image: '',
        timestamp: new Date().toISOString(),
        targetBranches: JSON.stringify(branches),
        targetBatches: JSON.stringify(batches)
      },
      android: {
        priority: 'high',
        ttl: 86400000, // 24 hours in milliseconds
      },
      apns: {
        payload: {
          aps: {
            'content-available': 1,
            sound: 'default',
          },
        },
      },
      // Will be set per topic
    };

    // Send to each topic
    const results = [];
    for (const topic of topics) {
      try {
        const message = {
          notification: {
            title: `New Notice from ${senderName}`,
            body: messageText.substring(0, 150),
          },
          data: {
            title: `New Notice from ${senderName}`,
            body: messageText.substring(0, 150),
            messageId: messageId || '',
            timestamp: new Date().toISOString(),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            sound: 'default',
          },
          android: {
            priority: 'high',
            ttl: 86400000, // 24 hours
          },
          apns: {
            payload: {
              aps: {
                'content-available': 1,
                sound: 'default',
              },
            },
          },
          topic: topic
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ Notification sent to topic ${topic}`, response);
        results.push({ topic, success: true, response });
      } catch (error) {
        console.error(`❌ Failed to send to topic ${topic}:`, error.message, error.stack);
        results.push({ topic, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`📊 Notification summary: ${successCount}/${topics.length} topics successful`);
    
    return { 
      success: successCount > 0, 
      results,
      totalTopics: topics.length,
      successfulTopics: successCount
    };
  } catch (error) {
    console.error(`❌ Error in sendPushNotificationToTopic:`, error.message);
    return { success: false, error: error.message };
  }
};

// Helper function for push notifications
const sendPushNotificationToStudent = async (student, messageText, messageId = '') => {
  if (!student.fcmTokens || student.fcmTokens.length === 0) {
    console.log(`No FCM tokens for student ${student.studentId}`);
    return;
  }

  try {
    // Count unread messages for this student (messages where delivered is false)
    const unreadCount = await Message.countDocuments({
      recipients: {
        $elemMatch: {
          studentId: student.studentId,
          delivered: false
        }
      }
    });

    console.log(`📤 Sending push notification to ${student.studentId} (${student.fcmTokens.length} devices, ${unreadCount} unread)`);

    // Send notification to all registered devices
    const notificationPromises = student.fcmTokens.map(async (fcmToken) => {
      try {
        const result = await sendPushNotification(
          fcmToken,
          'New message from HOD',
          messageText.substring(0, 100),
          {
            messageId: messageId,
            type: 'batch_message',
          },
          unreadCount || 1  // Badge count (minimum 1 for new message)
        );

        if (result.success) {
          console.log(`✅ Notification sent to ${student.studentId} (token: ${fcmToken.substring(0, 20)}...)`);
        } else {
          console.log(`❌ Failed to send notification to ${student.studentId} (token: ${fcmToken.substring(0, 20)}...):`, result.error);
        }
        return result;
      } catch (error) {
        console.error(`❌ Error sending to token ${fcmToken.substring(0, 20)}...:`, error.message);
        return { success: false, error: error.message };
      }
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error(`❌ Error sending notification to ${student.studentId}:`, error.message);
  }
};

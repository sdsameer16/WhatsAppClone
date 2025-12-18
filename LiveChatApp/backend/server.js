import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
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

// Initialize Firebase
initializeFirebase();

const app = express();
app.use(cors());
app.use(express.json());

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
  res.json({ status: "ok" });
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

    // Parse Excel/CSV file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

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
    res.status(500).json({ error: "Failed to upload sections" });
  }
});

// ==================== MESSAGE ROUTES ====================

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
    const messages = await Message.find({
      targetBatches: student.batch,
      targetBranches: student.branch,
    }).sort({ timestamp: 1 });

    res.json(messages);
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

    await Student.findOneAndUpdate(
      { studentId },
      { fcmToken },
      { new: true }
    );

    res.json({ success: true });
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
    console.log(`Student ${studentId} connected`);

    connectedStudents[studentId] = socket.id;

    // Update student online status
    await Student.findOneAndUpdate(
      { studentId },
      { isOnline: true, lastSeen: new Date() }
    );

    // Notify admin about student count update
    if (adminSocket) {
      sendBatchInfoToAdmin();
    }

    // Send pending messages to student
    const student = await Student.findOne({ studentId });
    if (student) {
      const pendingMessages = await Message.find({
        targetBatches: student.batch,
        targetBranches: student.branch,
        "recipients.studentId": studentId,
        "recipients.delivered": false,
      });

      pendingMessages.forEach(msg => {
        socket.emit("receiveMessage", {
          messageId: msg.messageId,
          senderName: msg.senderName,
          message: msg.message,
          timestamp: msg.timestamp,
        });
      });
    }
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

      // Send to online students via socket
      let onlineCount = 0;
      let offlineCount = 0;

      targetStudents.forEach(student => {
        const socketId = connectedStudents[student.studentId];
        if (socketId) {
          io.to(socketId).emit("receiveMessage", {
            messageId: newMessage.messageId,
            senderName,
            message,
            timestamp: newMessage.timestamp,
          });
          onlineCount++;
        } else {
          offlineCount++;
          // Send push notification via Firebase
          sendPushNotificationToStudent(student, message);
        }
      });

      console.log(`Message sent: ${onlineCount} online, ${offlineCount} offline`);

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
    console.log("User disconnected:", socket.id);

    // Find and update student status
    for (const studentId in connectedStudents) {
      if (connectedStudents[studentId] === socket.id) {
        delete connectedStudents[studentId];
        await Student.findOneAndUpdate(
          { studentId },
          { isOnline: false, lastSeen: new Date() }
        );
        break;
      }
    }

    if (socket.id === adminSocket) {
      adminSocket = null;
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

// Helper function for push notifications
const sendPushNotificationToStudent = async (student, message) => {
  if (!student.fcmToken) {
    console.log(`No FCM token for student ${student.studentId}`);
    return;
  }

  try {
    const result = await sendPushNotification(
      student.fcmToken,
      'New message from HOD',
      message.substring(0, 100),
      {
        messageId: message.messageId || '',
        type: 'batch_message',
      }
    );

    if (!result.success) {
      console.log(`Failed to send notification to ${student.studentId}:`, result.error);
    }
  } catch (error) {
    console.error(`Error sending notification to ${student.studentId}:`, error);
  }
};

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
  },
  sender: {
    type: String,
    required: true,
    enum: ["admin", "student"],
  },
  senderName: {
    type: String,
    required: true,
  },
  senderMobile: {
    type: String,
  },
  senderRole: {
    type: String,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "General",
      "Academic Updates",
      "T&P Updates",
      "Coding & App Development Updates",
      "Assessment Related Updates",
      "Student Activities Updates",
      "Certification and Internship Updates",
      "Student Achievements",
      "Faculty Achievements"
    ],
    default: "General",
  },
  message: {
    type: String,
    required: true,
  },
  targetBatches: [{
    type: String,
    required: true,
    // Format: "2023-2027"
  }],
  targetBranches: [{
    type: String,
    required: true,
    uppercase: true,
  }],
  recipients: [{
    studentId: String,
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
  }],
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
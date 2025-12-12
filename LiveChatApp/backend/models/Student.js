import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  startYear: {
    type: Number,
    required: true,
  },
  endYear: {
    type: Number,
    required: true,
  },
  batch: {
    type: String,
    // Format: "2023-2027" - auto-generated from startYear and endYear
  },
  fcmToken: {
    type: String,
    default: null,
    // For Firebase Cloud Messaging push notifications
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create batch string from start and end year
studentSchema.pre('save', function(next) {
  if (this.startYear && this.endYear) {
    this.batch = `${this.startYear}-${this.endYear}`;
  }
  next();
});

const Student = mongoose.model("Student", studentSchema);

export default Student;

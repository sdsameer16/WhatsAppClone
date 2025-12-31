// Function to sync student details with the Android App
function subscribeStudentToNotices(branch, batches) {
  const bridge = window.NoticeB || window.NoticeB_Native;
  if (!bridge) {
    console.log("NoticeB bridge not found! Are you running inside the Android App?");
    return;
  }

  // Subscribe to Branch topic (e.g., "Branch_CSE")
  if (branch) {
    bridge.subscribe("Branch_" + branch);
  }

  // Subscribe to each Batch topic (e.g., "Batch_2027-2028")
  if (batches && Array.isArray(batches)) {
    batches.forEach(batch => {
      bridge.subscribe("Batch_" + batch);
    });
  }

  console.log("Topics Synced: Branch " + branch + ", Batches: " + (batches || []).join(", "));
}
import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { requestNotificationPermission, onMessageListener } from "./firebaseConfig";
import CSELoader from "./CSELoader";

const API_URL = "https://whatsappclone-1-1r7l.onrender.com";
let socket = null;

// Register device for push (FCM) using student data
async function registerForPush(student) {
  if (!student) return;

  console.log("📱 Initializing FCM for student:", student.studentId);

  // Normalize branch/batches
  const branch = student.branch?.replace(/\s+/g, "_").toUpperCase();
  const batches = Array.isArray(student.batches)
    ? student.batches
    : student.batch
      ? [student.batch]
      : (student.startYear && student.endYear)
        ? [`${student.startYear}-${student.endYear}`]
        : [];

  // Android bridge topic subscribe (if present)
  subscribeStudentToNotices(branch, batches);

  // Request token and send to backend
  try {
    const fcmToken = await requestNotificationPermission();
    if (fcmToken) {
      console.log("✅ FCM Token received:", fcmToken.substring(0, 30) + "...");
      const response = await axios.post(`${API_URL}/api/fcm-token`, {
        studentId: student.studentId,
        fcmToken,
        branch,
        batches,
      });
      console.log("✅ FCM token registered:", response.data);
    } else {
      console.log("⚠️ No FCM token received - notifications will not work");
    }
  } catch (error) {
    console.error("❌ Failed to register FCM token:", error.response?.data || error.message);
  }
}

const StudentChat = () => {
  const [currentView, setCurrentView] = useState("login"); // login, register, chat
  const [studentId, setStudentId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [student, setStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check if student is already logged in (token in localStorage)
    const token = localStorage.getItem("studentToken");
    const savedStudent = localStorage.getItem("student");
    
    if (token && savedStudent) {
      setStudent(JSON.parse(savedStudent));
      setCurrentView("chat");
    }
  }, []);

  useEffect(() => {
    if (student && currentView === "chat") {
      registerForPush(student);

      // Listen for foreground messages
      onMessageListener().then((payload) => {
        console.log("📬 Foreground notification received:", payload);
        // Show system banner notification while app is open
        try {
          const { title, body } = payload.notification || {};
          if (title && body && "Notification" in window && Notification.permission === "granted") {
            const options = {
              body,
              icon: "/logo192.png",
              badge: "/logo192.png",
              vibrate: [200, 100, 200],
              data: payload.data || {},
            };
            navigator.serviceWorker?.ready
              .then((registration) => registration.showNotification(title, options))
              .catch((err) => {
                console.warn("SW notification fallback failed, using Notification:", err);
                new Notification(title, options);
              });
          }
        } catch (err) {
          console.warn("Foreground banner notification failed:", err);
        }
        toast.info(`📬 ${payload.notification.title}: ${payload.notification.body}`);
      }).catch((err) => console.log("⚠️ Failed to setup foreground message listener:", err));

      // Initialize socket connection
      socket = io(API_URL);

      // Register student with socket (this sets online status)
      socket.emit("registerStudent", { studentId: student.studentId });
      console.log("🔌 Socket connected, student registered as ONLINE");

      // Load message history
      loadMessages();

      // Listen for new messages
      socket.on("receiveMessage", (data) => {
        const newMsg = {
          messageId: data.messageId,
          sender: "admin",
          senderName: data.senderName,
          message: data.message,
          timestamp: data.timestamp,
        };
        
        // Check if message already exists (avoid duplicates)
        setMessages((prevMessages) => {
          const isDuplicate = prevMessages.some(msg => msg.messageId === data.messageId);
          
          if (!isDuplicate) {
            // Show small toast notification for NEW message only
            toast.info(`📬 ${data.senderName}: ${data.message.substring(0, 30)}...`, {
              position: "top-center",
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
            
            playNotification();
            
            return [...prevMessages, newMsg];
          }
          
          return prevMessages;
        });

        // Mark as delivered
        socket.emit("markDelivered", {
          messageId: data.messageId,
          studentId: student.studentId,
        });
      });

      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    }
  }, [student, currentView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/messages/${student.studentId}`);
      
      // Load messages silently (no notifications for old messages)
      setMessages(response.data);
      console.log(`📨 Loaded ${response.data.length} messages (silent load)`);

      // Mark all loaded messages as delivered
      response.data.forEach(msg => {
        if (socket && msg.messageId) {
          socket.emit("markDelivered", {
            messageId: msg.messageId,
            studentId: student.studentId,
          });
        }
      });
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playNotification = () => {
    try {
      new Audio("/notification.mp3").play().catch(err => {
        console.log("Audio play prevented:", err);
      });
    } catch (error) {
      console.log("Audio error:", error);
    }
  };

  const handleLogin = async () => {
    if ((!studentId.trim() && !mobileNumber.trim()) || !password.trim()) {
      toast.error("Please enter Student ID/Mobile number and password");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/student/login`, {
        studentId: studentId || undefined,
        mobileNumber: mobileNumber || undefined,
        password,
      });

      if (response.data.success) {
        localStorage.setItem("studentToken", response.data.token);
        localStorage.setItem("student", JSON.stringify(response.data.student));
        setStudent(response.data.student);
        setCurrentView("chat");
        toast.success("Login successful!");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed");
    }
  };

  const handleRegister = async () => {
    if (!studentId.trim() || !name.trim() || !mobileNumber.trim() || !password.trim() || !branch.trim() || !startYear || !endYear) {
      toast.error("Please fill all fields");
      return;
    }

    if (parseInt(startYear) >= parseInt(endYear)) {
      toast.error("End year must be after start year");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/student/register`, {
        studentId,
        name,
        mobileNumber,
        password,
        branch,
        startYear: parseInt(startYear),
        endYear: parseInt(endYear),
      });

      if (response.data.success) {
        localStorage.setItem("studentToken", response.data.token);
        localStorage.setItem("student", JSON.stringify(response.data.student));
        setStudent(response.data.student);
        setCurrentView("chat");
        toast.success("Registration successful!");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Registration failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("student");
    setStudent(null);
    setCurrentView("login");
    if (socket) {
      socket.disconnect();
    }
    toast.info("Logged out successfully");
  };

  // ==================== LOGIN VIEW ====================
  if (currentView === "login") {
    return (
      <div style={styles.container}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>🎓 Student Login</h2>
          <p style={styles.subtitle}>College Batch Messaging System</p>

          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Student ID or Mobile Number"
            style={styles.input}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={styles.input}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
          />

          <button onClick={handleLogin} style={styles.primaryButton}>
            Login
          </button>

          <button
            onClick={() => setCurrentView("register")}
            style={styles.secondaryButton}
          >
            New Student? Register Here
          </button>
        </div>
        <ToastContainer 
          position="top-center" 
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          limit={3}
        />
      </div>
    );
  }

  // ==================== REGISTER VIEW ====================
  if (currentView === "register") {
    return (
      <div style={styles.container}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>📝 Student Registration</h2>

          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Student ID (e.g., STU001)"
            style={styles.input}
          />

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            style={styles.input}
          />

          <input
            type="tel"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Mobile Number (10 digits)"
            style={styles.input}
            maxLength="10"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={styles.input}
          />

          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value.toUpperCase())}
            placeholder="Branch (e.g., CSE, ECE, MECH)"
            style={styles.input}
          />

          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              placeholder="Start Year (2023)"
              style={{ ...styles.input, flex: 1 }}
            />

            <input
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="End Year (2027)"
              style={{ ...styles.input, flex: 1 }}
            />
          </div>

          <button onClick={handleRegister} style={styles.primaryButton}>
            Register
          </button>

          <button
            onClick={() => setCurrentView("login")}
            style={styles.secondaryButton}
          >
            Already have an account? Login
          </button>
        </div>
        <ToastContainer 
          position="top-center" 
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          limit={3}
        />
      </div>
    );
  }

  // ==================== CHAT VIEW ====================
  if (isLoading) {
    return <CSELoader />;
  }

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <div>
          <h3 style={styles.chatTitle}>📚 College Messages</h3>
          <div style={styles.studentInfo}>
            {student.name} • {student.studentId} • {student.branch} • Batch: {student.batch}
            {student.section && ` • Section: ${student.section}`}
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      <div style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <p>📭 No messages yet</p>
            <p style={{ fontSize: 14, color: "#666" }}>
              Messages from HOD will appear here
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={styles.messageCard}>
              <div style={styles.messageHeader}>
                <strong>👨‍💼 {msg.senderName || "HOD"}</strong>
                <span style={styles.timestamp}>
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <div style={styles.messageContent}>{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.infoBox}>
        ℹ️ This is a read-only message board. You'll receive notifications from your HOD here.
      </div>

      <ToastContainer 
        position="top-center" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        limit={3}
      />
    </div>
  );
};

// ==================== STYLES ====================
const styles = {
  container: {
    width: "100%",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "Arial, sans-serif",
    padding: "0",
    margin: "0",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  formCard: {
    background: "white",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  title: {
    margin: "0 0 10px 0",
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    margin: "0 0 20px 0",
    color: "#666",
    fontSize: "14px",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "2px solid #ddd",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  primaryButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "10px",
  },
  secondaryButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "transparent",
    color: "#667eea",
    border: "2px solid #667eea",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
  },
  chatContainer: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "white",
    borderRadius: "0",
    margin: "0",
    padding: "0",
    overflow: "hidden",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatHeader: {
    padding: "20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatTitle: {
    margin: "0 0 5px 0",
  },
  studentInfo: {
    fontSize: "13px",
    opacity: 0.9,
  },
  logoutButton: {
    padding: "8px 16px",
    background: "rgba(255,255,255,0.2)",
    color: "white",
    border: "1px solid white",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    background: "#f5f5f5",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#999",
  },
  messageCard: {
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "15px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    borderLeft: "4px solid #667eea",
  },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    alignItems: "center",
  },
  timestamp: {
    fontSize: "11px",
    color: "#999",
  },
  messageContent: {
    color: "#333",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
  },
  infoBox: {
    padding: "12px",
    background: "#fffbea",
    borderTop: "1px solid #f0e68c",
    fontSize: "13px",
    color: "#666",
    textAlign: "center",
  },
};

export default StudentChat;

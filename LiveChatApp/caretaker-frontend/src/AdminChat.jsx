import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = "https://whatsappclone-1-1r7l.onrender.com";
let socket = null;

const AdminChat = () => {
  const [currentView, setCurrentView] = useState("login"); // login, chat
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState(null);

  // Registration State
  const [newName, setNewName] = useState("");
  const [newAdminId, setNewAdminId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newRole, setNewRole] = useState("HOD"); // Default
  const [newDepartment, setNewDepartment] = useState("");

  const roles = ["HOD", "DEO", "Coordinator", "Faculty", "Principal"]; // Options
  const categories = [
    "General",
    "Academic Updates",
    "T&P Updates",
    "Coding & App Development Updates",
    "Assessment Related Updates",
    "Student Activities Updates",
    "Certification and Internship Updates",
    "Student Achievements",
    "Faculty Achievements"
  ];

  // Filters and data

  // Filters and data
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);

  // Selection state
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

  // Get unique batch years from batches data
  const batchYears = [...new Set(batches.map(b => b.batch))].sort().reverse();

  // Message state
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [uploadFile, setUploadFile] = useState(null);
  const [showStudentList, setShowStudentList] = useState(true);

  // Message history
  const [messageHistory, setMessageHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState("");
  const [infoMessage, setInfoMessage] = useState(null); // { recipients: [] }
  const [isAutoCategory, setIsAutoCategory] = useState(true); // Track if user manually changed it

  // Auto-categorization
  useEffect(() => {
    if (!message || !isAutoCategory) return;
    const msgLower = message.toLowerCase();

    if (msgLower.includes("exam") || msgLower.includes("test") || msgLower.includes("quiz") || msgLower.includes("result") || msgLower.includes("mid") || msgLower.includes("sem")) {
      setSelectedCategory("Assessment Related Updates");
    } else if (msgLower.includes("placement") || msgLower.includes("job") || msgLower.includes("intern") || msgLower.includes("package") || msgLower.includes("hiring")) {
      setSelectedCategory("T&P Updates");
    } else if (msgLower.includes("code") || msgLower.includes("hackathon") || msgLower.includes("app") || msgLower.includes("web") || msgLower.includes("development")) {
      setSelectedCategory("Coding & App Development Updates");
    } else if (msgLower.includes("certificate") || msgLower.includes("course") || msgLower.includes("enroll")) {
      setSelectedCategory("Certification and Internship Updates");
    } else if (msgLower.includes("schedule") || msgLower.includes("class") || msgLower.includes("lecture") || msgLower.includes("timetable")) {
      setSelectedCategory("Academic Updates");
    } else if (msgLower.includes("achievement") || msgLower.includes("winner") || msgLower.includes("congratulation")) {
      setSelectedCategory("Student Achievements");
    }
  }, [message, isAutoCategory]);

  useEffect(() => {
    // Check if admin is already logged in
    const token = localStorage.getItem("adminToken");
    const savedAdmin = localStorage.getItem("admin");

    if (token && savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
      setCurrentView("chat");
    }
  }, []);

  useEffect(() => {
    if (admin && currentView === "chat") {
      // Initialize socket connection
      socket = io(API_URL);
      socket.emit("registerAdmin");

      // Load initial data
      loadBatchesAndBranches();
      loadSections();
      loadStudents();

      // Set up interval to refresh student list every 10 seconds
      const interval = setInterval(() => {
        loadStudents();
      }, 10000);

      return () => {
        if (socket) {
          socket.disconnect();
        }
        clearInterval(interval);
      };
    }
  }, [admin, currentView, selectedBatches, selectedBranches, selectedSection]);

  const loadBatchesAndBranches = async () => {
    try {
      const [batchesRes, branchesRes] = await Promise.all([
        axios.get(`${API_URL}/api/batches`),
        axios.get(`${API_URL}/api/branches`),
      ]);

      setBatches(batchesRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load batches and branches");
    }
  };

  const loadSections = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sections`);
      setSections(response.data);
    } catch (error) {
      console.error("Error loading sections:", error);
    }
  };

  const loadStudents = async () => {
    if (selectedBatches.length === 0 && selectedBranches.length === 0 && !selectedSection) {
      setStudents([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (selectedBatches.length > 0) params.append("batches", selectedBatches.join(","));
      if (selectedBranches.length > 0) params.append("branches", selectedBranches.join(","));
      if (selectedSection) params.append("section", selectedSection);

      const response = await axios.get(`${API_URL}/api/students?${params}`);
      setStudents(response.data);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const loadMessageHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/messages`);
      setMessageHistory(response.data);
      console.log(`📨 Loaded ${response.data.length} sent messages`);
    } catch (error) {
      console.error("Error loading message history:", error);
      toast.error("Failed to load message history");
    }
  };

  const handleLogin = async () => {
    if (!adminId.trim() || !password.trim()) {
      toast.error("Please enter Admin ID and password");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        adminId,
        password,
      });

      if (response.data.success) {
        localStorage.setItem("adminToken", response.data.token);
        localStorage.setItem("admin", JSON.stringify(response.data.admin));
        setAdmin(response.data.admin);
        setCurrentView("chat");
        toast.success("Login successful!");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed");
    }
  };

  const handleEditMessage = (msg) => {
    setEditingMessageId(msg.messageId);
    setEditMessageContent(msg.message);
  };

  const saveEditMessage = async (messageId) => {
    try {
      await axios.put(`${API_URL}/api/messages/${messageId}`, { message: editMessageContent });
      toast.success("Message updated successfully");
      setEditingMessageId(null);
      loadMessageHistory(); // Refresh
    } catch (error) {
      toast.error("Failed to update message");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message for everyone?")) return;
    try {
      await axios.delete(`${API_URL}/api/messages/${messageId}`);
      toast.success("Message deleted for everyone");
      loadMessageHistory(); // Refresh
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const handleViewInfo = async (messageId) => {
    try {
      const response = await axios.get(`${API_URL}/api/messages/${messageId}/info`);
      setInfoMessage(response.data);
    } catch (error) {
      toast.error("Failed to load message info");
    }
  };

  const handleRegister = async () => {
    if (!newName || !newAdminId || !newPassword || !newMobile || !newDepartment) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/admin/create`, {
        name: newName,
        adminId: newAdminId,
        password: newPassword,
        mobileNumber: newMobile,
        role: newRole,
        department: newDepartment
      });

      if (response.data.success) {
        toast.success("Registration successful! Please login.");
        setCurrentView("login");
        // Clear form
        setNewName("");
        setNewAdminId("");
        setNewPassword("");
        setNewMobile("");
        setNewDepartment("");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Registration failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    setAdmin(null);
    setCurrentView("login");
    if (socket) {
      socket.disconnect();
    }
    toast.info("Logged out successfully");
  };

  const toggleBatch = (batch) => {
    setSelectedBatches(prev => {
      const newBatches = prev.includes(batch)
        ? prev.filter(b => b !== batch)
        : [...prev, batch];
      return newBatches;
    });
  };

  const toggleAllBatches = (selectAll) => {
    if (selectAll) {
      setSelectedBatches(batchYears);
    } else {
      setSelectedBatches([]);
    }
  };

  const toggleBranch = (branch) => {
    setSelectedBranches(prev => {
      const newBranches = prev.includes(branch)
        ? prev.filter(b => b !== branch)
        : [...prev, branch];
      return newBranches;
    });
  };

  const toggleAllBranches = (selectAll) => {
    if (selectAll) {
      setSelectedBranches([...branches]);
    } else {
      setSelectedBranches([]);
    }
  };

  const sendBatchMessage = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (selectedBatches.length === 0) {
      toast.error("Please select at least one batch");
      return;
    }

    if (selectedBranches.length === 0) {
      toast.error("Please select at least one branch");
      return;
    }

    socket.emit("sendBatchMessage", {
      batches: selectedBatches,
      branches: selectedBranches,
      section: selectedSection || undefined,
      message,
      message,
      senderName: admin.name,
      senderRole: admin.role,
      senderMobile: admin.mobileNumber,
      category: selectedCategory
    });

    toast.info("Sending message...");
    setMessage("");
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const response = await axios.post(`${API_URL}/api/upload-sections`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\nUpdated: ${response.data.stats.updated}, Not Found: ${response.data.stats.notFound}`);
        setUploadFile(null);
        loadSections();
        loadStudents();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Upload failed");
    }
  };

  // ==================== LOGIN VIEW ====================
  if (currentView === "login") {
    return (
      <div style={styles.container}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>👨‍💼 HOD Login</h2>
          <p style={styles.subtitle}>College Batch Messaging System</p>

          <input
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            placeholder="Admin ID"
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
            Login as HOD
          </button>
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button onClick={() => setCurrentView('register')} style={styles.secondaryButton}>
              New Staff? Register Here
            </button>
          </div>
        </div>
        <ToastContainer position="bottom-right" />
      </div>
    );
  }

  // ==================== REGISTER VIEW ====================
  if (currentView === "register") {
    return (
      <div style={styles.container}>
        <div style={styles.formCard}>
          <h2 style={styles.title}>📝 Staff Registration</h2>
          <p style={styles.subtitle}>Create your profile</p>

          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full Name" style={styles.input} />
          <input type="text" value={newAdminId} onChange={(e) => setNewAdminId(e.target.value)} placeholder="Staff ID (e.g. FAC01)" style={styles.input} />
          <input type="tel" value={newMobile} onChange={(e) => setNewMobile(e.target.value)} placeholder="Mobile Number" style={styles.input} />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" style={styles.input} />
          <input type="text" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="Department (e.g. CSE)" style={styles.input} />

          <label style={{ alignSelf: 'flex-start', fontSize: '14px', color: '#555', marginTop: '10px' }}>Role:</label>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={styles.input}>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <button onClick={handleRegister} style={styles.primaryButton}>Register</button>

          <button onClick={() => setCurrentView("login")} style={styles.secondaryButton}>
            Back to Login
          </button>
        </div>
        <ToastContainer position="bottom-right" />
      </div>
    );
  }

  // ==================== ADMIN DASHBOARD ====================
  const onlineStudents = students.filter(s => s.isOnline);
  const offlineStudents = students.filter(s => !s.isOnline);

  // MESSAGE HISTORY VIEW
  if (showHistory) {
    return (
      <div style={styles.dashboardContainer}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>📜 Message History</h2>
            <p style={styles.headerSubtitle}>All sent messages</p>
          </div>
          <button onClick={() => setShowHistory(false)} style={styles.logoutButton}>
            Back to Dashboard
          </button>
        </div>

        <div style={styles.historyContainer}>
          {/* Info Modal */}
          {infoMessage && (
            <div style={styles.modalOverlay} onClick={() => setInfoMessage(null)}>
              <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3>📊 Message Delivery Info</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Student</th>
                        <th style={{ padding: '8px' }}>Mobile</th>
                        <th style={{ padding: '8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {infoMessage.recipients.map(r => (
                        <tr key={r.studentId} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px' }}>{r.name} ({r.studentId})</td>
                          <td style={{ padding: '8px' }}>{r.mobileNumber}</td>
                          <td style={{ padding: '8px' }}>
                            {r.delivered ? "✅ Delivered" : "⏳ Pending"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => setInfoMessage(null)} style={styles.closeModalBtn}>Close</button>
              </div>
            </div>
          )}

          {messageHistory.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No messages sent yet</p>
            </div>
          ) : (
            messageHistory.map((msg, index) => (
              <div key={msg.messageId || index} style={styles.historyCard}>
                <div style={styles.historyHeader}>
                  <strong style={styles.historySender}>{msg.senderName} ({msg.senderRole || "HOD"})</strong>
                  <span style={styles.historyTimestamp}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>

                {editingMessageId === msg.messageId ? (
                  <div style={{ margin: '10px 0' }}>
                    <textarea
                      value={editMessageContent}
                      onChange={(e) => setEditMessageContent(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      <button onClick={() => saveEditMessage(msg.messageId)} style={{ ...styles.actionButton, background: '#28a745' }}>Save</button>
                      <button onClick={() => setEditingMessageId(null)} style={{ ...styles.actionButton, background: '#6c757d' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.historyMessage}>{msg.message}</div>
                )}

                <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
                  Category: <strong>{msg.category || "General"} | </strong>
                  Sender Mobile: {msg.senderMobile || "N/A"}
                </div>

                <div style={styles.historyTarget}>
                  📍 Batches: {msg.targetBatches?.join(", ")} | Branches: {msg.targetBranches?.join(", ")}
                  {msg.targetSection && ` | Section: ${msg.targetSection}`}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <div style={styles.historyStats}>
                    Delivered: {msg.recipients?.filter(r => r.delivered).length || 0} / {msg.recipients?.length || 0}
                  </div>

                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => handleViewInfo(msg.messageId)} style={{ ...styles.actionButton, background: '#17a2b8' }}>Info</button>
                    <button onClick={() => handleEditMessage(msg)} style={{ ...styles.actionButton, background: '#ffc107', color: '#000' }}>Edit</button>
                    <button onClick={() => handleDeleteMessage(msg.messageId)} style={{ ...styles.actionButton, background: '#dc3545' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.headerTitle}>📢 HOD Dashboard</h2>
          <p style={styles.headerSubtitle}>
            {admin.name} • {admin.role} • {admin.department}
          </p>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      <div style={styles.mainContent}>
        {/* LEFT PANEL - Filters & Student List */}
        <div style={styles.leftPanel}>
          <h3 style={styles.panelTitle}>Select Target Audience</h3>

          {/* Branch Selection */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <label style={styles.label}>Branches:</label>
              <button
                onClick={() => toggleAllBranches(selectedBranches.length !== branches.length)}
                style={styles.selectAllButton}
              >
                {selectedBranches.length === branches.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={styles.checkboxGroup}>
              {branches.map(branch => (
                <label
                  key={branch}
                  style={{
                    ...styles.checkboxLabel,
                    ...(selectedBranches.includes(branch) ? styles.selectedItem : {})
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch)}
                    onChange={() => toggleBranch(branch)}
                    style={styles.checkbox}
                  />
                  {branch}
                </label>
              ))}
            </div>
            {selectedBranches.length > 0 && (
              <div style={styles.selectionInfo}>
                Selected: {selectedBranches.length} of {branches.length}
              </div>
            )}
          </div>

          {/* Batch Selection */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <label style={styles.label}>Batches:</label>
              <button
                onClick={() => toggleAllBatches(selectedBatches.length !== batchYears.length)}
                style={styles.selectAllButton}
              >
                {selectedBatches.length === batchYears.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={styles.checkboxGroup}>
              {batchYears.map(year => (
                <label
                  key={year}
                  style={{
                    ...styles.batchLabel,
                    ...(selectedBatches.includes(year) ? styles.selectedItem : {})
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedBatches.includes(year)}
                    onChange={() => toggleBatch(year)}
                    style={styles.checkbox}
                  />
                  <strong>{year}</strong>
                </label>
              ))}
            </div>
            {selectedBatches.length > 0 && (
              <div style={styles.selectionInfo}>
                Selected: {selectedBatches.length} of {batchYears.length}
              </div>
            )}
          </div>

          {/* Section Selection */}
          <div style={styles.section}>
            <label style={styles.label}>Section (Optional):</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              style={styles.select}
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>

          {/* Student List Toggle */}
          <button
            onClick={() => setShowStudentList(!showStudentList)}
            style={styles.toggleButton}
          >
            {showStudentList ? "Hide" : "Show"} Student List ({students.length})
          </button>

          {/* Student List */}
          {showStudentList && students.length > 0 && (
            <div style={styles.studentListContainer}>
              <div style={styles.studentStats}>
                <span style={styles.onlineIndicator}>🟢 Online: {onlineStudents.length}</span>
                <span style={styles.offlineIndicator}>⚫ Offline: {offlineStudents.length}</span>
              </div>

              {onlineStudents.length > 0 && (
                <div style={styles.studentGroup}>
                  <h4 style={styles.groupTitle}>🟢 Online Students</h4>
                  {onlineStudents.map(student => (
                    <div key={student.studentId} style={styles.studentCard}>
                      <div>
                        <strong>{student.name}</strong>
                        <div style={styles.studentDetails}>
                          {student.studentId} • {student.mobileNumber}
                        </div>
                        <div style={styles.studentDetails}>
                          {student.branch} • Batch: {student.batch}
                          {student.section && ` • Sec: ${student.section}`}
                        </div>
                      </div>
                      <span style={styles.statusBadgeOnline}>Online</span>
                    </div>
                  ))}
                </div>
              )}

              {offlineStudents.length > 0 && (
                <div style={styles.studentGroup}>
                  <h4 style={styles.groupTitle}>⚫ Offline Students</h4>
                  {offlineStudents.map(student => (
                    <div key={student.studentId} style={styles.studentCard}>
                      <div>
                        <strong>{student.name}</strong>
                        <div style={styles.studentDetails}>
                          {student.studentId} • {student.mobileNumber}
                        </div>
                        <div style={styles.studentDetails}>
                          {student.branch} • Batch: {student.batch}
                          {student.section && ` • Sec: ${student.section}`}
                        </div>
                        <div style={styles.lastSeen}>
                          Last seen: {new Date(student.lastSeen).toLocaleString()}
                        </div>
                      </div>
                      <span style={styles.statusBadgeOffline}>Offline</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Message Composer & Section Upload */}
        <div style={styles.rightPanel}>
          <h3 style={styles.panelTitle}>Compose Message</h3>

          <button
            onClick={() => {
              loadMessageHistory();
              setShowHistory(true);
            }}
            style={styles.historyButton}
          >
            📜 View Message History
          </button>

          <label style={styles.label}>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setIsAutoCategory(false);
            }}
            style={{ ...styles.select, marginBottom: '15px' }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message to students here..."
            style={styles.textarea}
            rows={8}
          />

          <div style={styles.selectionSummary}>
            <div style={styles.selectionSummaryItem}>
              <span>Branches: </span>
              <strong>{selectedBranches.length} selected</strong>
            </div>
            <div style={styles.selectionSummaryItem}>
              <span>Batches: </span>
              <strong>{selectedBatches.length} selected</strong>
            </div>
            {selectedSection && (
              <div style={styles.selectionSummaryItem}>
                <span>Section: </span>
                <strong>{selectedSection}</strong>
              </div>
            )}
          </div>

          <button
            onClick={sendBatchMessage}
            style={{
              ...styles.sendButton,
              opacity: (message.trim() && selectedBatches.length > 0 && selectedBranches.length > 0) ? 1 : 0.5,
              backgroundColor: (selectedBatches.length > 0 && selectedBranches.length > 0)
                ? '#4CAF50'
                : styles.sendButton.backgroundColor,
            }}
            disabled={!message.trim() || selectedBatches.length === 0 || selectedBranches.length === 0}
          >
            {selectedBatches.length > 0 && selectedBranches.length > 0
              ? `📤 Send to Selected (${students.length} students)`
              : 'Select branches and batches to send'}
          </button>

          <div style={styles.divider}></div>

          <h3 style={styles.panelTitle}>Upload Section Assignments</h3>
          <p style={styles.uploadInfo}>
            Upload Excel/CSV file with columns: <strong>studentId</strong> (or <strong>mobileNumber</strong>) and <strong>section</strong>
          </p>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setUploadFile(e.target.files[0])}
            style={styles.fileInput}
          />

          {uploadFile && (
            <div style={styles.filePreview}>
              📄 {uploadFile.name}
              <button onClick={() => setUploadFile(null)} style={styles.clearButton}>×</button>
            </div>
          )}

          <button
            onClick={handleFileUpload}
            style={{
              ...styles.uploadButton,
              opacity: uploadFile ? 1 : 0.5,
            }}
            disabled={!uploadFile}
          >
            📤 Upload Sections
          </button>
        </div>
      </div>

      <ToastContainer position="bottom-right" />
    </div>
  );
};

// ==================== STYLES ====================
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
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
    backgroundColor: "#f5576c",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "10px",
  },
  dashboardContainer: {
    width: "100%",
    height: "100vh",
    background: "#f5f7fa",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    color: "white",
    padding: "20px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    margin: "0 0 5px 0",
  },
  headerSubtitle: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.9,
  },
  logoutButton: {
    padding: "10px 20px",
    background: "rgba(255,255,255,0.2)",
    color: "white",
    border: "1px solid white",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "14px",
  },
  mainContent: {
    display: "flex",
    gap: "20px",
    padding: "20px",
    maxWidth: "1600px",
    margin: "0 auto",
  },
  leftPanel: {
    flex: "1",
    background: "white",
    borderRadius: "15px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    maxHeight: "calc(100vh - 140px)",
    overflowY: "auto",
  },
  rightPanel: {
    flex: "1",
    background: "white",
    borderRadius: "15px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  panelTitle: {
    margin: "0 0 20px 0",
    color: "#333",
    fontSize: "18px",
  },
  section: {
    marginBottom: "20px",
    padding: "15px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  selectAllButton: {
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#e0e0e0',
    },
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#90caf9',
    boxShadow: '0 0 0 1px #90caf9',
  },
  selectionInfo: {
    fontSize: '12px',
    color: '#666',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  selectionSummary: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '15px',
    borderLeft: '3px solid #4CAF50',
  },
  selectionSummaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px',
    fontSize: '14px',
  },
  label: {
    display: "block",
    marginBottom: "10px",
    fontWeight: "bold",
    color: "#555",
    fontSize: "14px",
  },
  checkboxGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    background: "#f8f9fa",
    borderRadius: "20px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    fontSize: "14px",
    transition: 'all 0.2s ease',
    margin: '2px',
    '&:hover': {
      background: '#e9ecef',
    },
  },
  batchLabel: {
    display: "flex",
    alignItems: "center",
    padding: "10px 15px",
    background: "#f8f9fa",
    borderRadius: "8px",
    margin: "4px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#e9ecef',
    },
  },
  checkbox: {
    marginRight: "8px",
    cursor: "pointer",
    width: "16px",
    height: "16px",
  },
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "2px solid #ddd",
    fontSize: "14px",
  },
  toggleButton: {
    width: "100%",
    padding: "10px",
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "15px",
  },
  studentListContainer: {
    marginTop: "15px",
  },
  studentStats: {
    display: "flex",
    gap: "20px",
    marginBottom: "15px",
    padding: "10px",
    background: "#f8f9fa",
    borderRadius: "8px",
    fontSize: "14px",
  },
  onlineIndicator: {
    color: "#28a745",
    fontWeight: "bold",
  },
  offlineIndicator: {
    color: "#666",
    fontWeight: "bold",
  },
  studentGroup: {
    marginBottom: "20px",
  },
  groupTitle: {
    margin: "0 0 10px 0",
    fontSize: "14px",
    color: "#666",
  },
  studentCard: {
    padding: "10px",
    background: "#f8f9fa",
    borderRadius: "8px",
    marginBottom: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
  },
  studentDetails: {
    color: "#666",
    fontSize: "12px",
    marginTop: "3px",
  },
  lastSeen: {
    color: "#999",
    fontSize: "11px",
    marginTop: "3px",
    fontStyle: "italic",
  },
  statusBadgeOnline: {
    padding: "4px 8px",
    background: "#d4edda",
    color: "#155724",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  statusBadgeOffline: {
    padding: "4px 8px",
    background: "#e0e0e0",
    color: "#666",
    borderRadius: "12px",
    fontSize: "11px",
  },
  textarea: {
    width: "100%",
    padding: "15px",
    borderRadius: "10px",
    border: "2px solid #ddd",
    fontSize: "14px",
    fontFamily: "Arial, sans-serif",
    resize: "vertical",
    minHeight: "150px",
    boxSizing: "border-box",
    marginBottom: "15px",
  },
  sendButton: {
    padding: "15px",
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  secondaryButton: {
    padding: "10px",
    background: "transparent",
    color: "#f5576c",
    border: "2px solid #f5576c",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    width: "100%",
    marginTop: "10px",
  },
  actionButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  closeModalBtn: {
    marginTop: '20px',
    width: '100%',
    padding: '10px',
    background: '#f5576c',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  divider: {
    height: "2px",
    background: "#e0e0e0",
    margin: "20px 0",
  },
  uploadInfo: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "15px",
    padding: "10px",
    background: "#fff3cd",
    borderRadius: "8px",
  },
  fileInput: {
    width: "100%",
    padding: "10px",
    border: "2px dashed #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "10px",
  },
  filePreview: {
    padding: "10px",
    background: "#e7f3ff",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    fontSize: "14px",
  },
  clearButton: {
    background: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    cursor: "pointer",
    fontSize: "16px",
  },
  uploadButton: {
    padding: "12px",
    background: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  }, historyButton: {
    width: "100%",
    padding: "12px",
    background: "#17a2b8",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  historyContainer: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
    background: "#f8f9fa",
    maxHeight: "calc(100vh - 120px)",
  },
  historyCard: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    borderLeft: "4px solid #667eea",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  historySender: {
    fontSize: "16px",
    color: "#333",
  },
  historyTimestamp: {
    fontSize: "12px",
    color: "#999",
  },
  historyMessage: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "10px",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
  },
  historyTarget: {
    fontSize: "12px",
    color: "#666",
    background: "#f0f0f0",
    padding: "8px",
    borderRadius: "6px",
    marginBottom: "8px",
  },
  historyStats: {
    fontSize: "12px",
    color: "#28a745",
    fontWeight: "bold",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#999",
  },
};

export default AdminChat;

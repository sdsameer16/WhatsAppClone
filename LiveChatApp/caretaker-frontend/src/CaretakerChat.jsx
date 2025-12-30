import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CSELoader from "./CSELoader";

const socket = io(" https://whatsappclone-1-1r7l.onrender.com");

const CaretakerChat = () => {
  const [parents, setParents] = useState([]);
  const [activeParent, setActiveParent] = useState("");
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [typingParent, setTypingParent] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch parents when component mounts
  useEffect(() => {
    const fetchParents = async () => {
      try {
        const res = await axios.get(" https://whatsappclone-1-1r7l.onrender.com/parents");
        setParents(res.data);
        console.log("Parents loaded:", res.data);
      } catch (error) {
        console.error("Error fetching parents:", error);
        // Fallback to empty array
        setParents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParents();
  }, []);

  useEffect(() => {
    socket.emit("register", { role: "caretaker" });

    socket.on("receiveFromParent", (data) => {
      console.log("Message received from parent:", data);
      
      // Only show toast for NEW messages when chat is not active
      if (data.parentId !== activeParent) {
        toast.info(`📬 New message from ${data.parentId}`, {
          position: "top-center",
          autoClose: 3000,
        });
        playNotification();
      }

      // Add parent to list if not already there
      setParents((prevParents) => {
        if (!prevParents.includes(data.parentId)) {
          console.log("Adding new parent to list:", data.parentId);
          return [...prevParents, data.parentId];
        }
        return prevParents;
      });

      // Save message to localStorage for accumulation (will be saved to DB on export)
      const newMessage = {
        parentId: data.parentId,
        sender: data.parentId,
        message: data.message,
        timestamp: new Date()
      };

      const existingLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
      const updatedLogs = [...existingLogs, newMessage];
      localStorage.setItem('chatLogs', JSON.stringify(updatedLogs));

      if (data.parentId === activeParent) {
        setChat((prev) => [
          ...prev,
          newMessage,
        ]);
      }
    });

    // Listen for parents list updates from server
    socket.on("parentsList", (parentsList) => {
      console.log("Received parents list from server:", parentsList);
      setParents(parentsList);
      setLoading(false);
    });

    socket.on("typingFromParent", (parentId) => {
      setTypingParent(parentId);
      setTimeout(() => setTypingParent(""), 2000);
    });

    return () => {
      socket.off("receiveFromParent");
      socket.off("parentsList");
      socket.off("typingFromParent");
    };
  }, [activeParent]);

  const playNotification = () => {
    try {
      new Audio("/notification.mp3").play().catch(err => {
        console.log("Audio play prevented:", err);
      });
    } catch (error) {
      console.log("Audio error:", error);
    }
  };

  const refreshParents = async () => {
    try {
      const res = await axios.get(" https://whatsappclone-1-1r7l.onrender.com/parents");
      setParents(res.data);
      console.log("Parents refreshed:", res.data);
    } catch (error) {
      console.error("Error refreshing parents:", error);
    }
  };

  const openChat = async (parentId) => {
    setActiveParent(parentId);
    setLoading(true);

    try {
      // First try to get messages from database
      const res = await axios.get(` https://whatsappclone-1-1r7l.onrender.com/messages/${parentId}`);
      let chatMessages = res.data;

      // If no messages in database, check localStorage for accumulated logs
      if (chatMessages.length === 0) {
        const localLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
        chatMessages = localLogs.filter(log => log.parentId === parentId);
      }

      // Load messages silently (no notifications)
      console.log(`📨 Loaded ${chatMessages.length} messages for ${parentId} (silent load)`);
      setChat(chatMessages);
    } catch (error) {
      console.error("Error loading chat:", error);
      // Fallback to localStorage only
      const localLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
      const chatMessages = localLogs.filter(log => log.parentId === parentId);
      setChat(chatMessages);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = () => {
    if (!activeParent || !message.trim()) return;

    const newMessage = {
      parentId: activeParent,
      sender: "caretaker",
      message,
      timestamp: new Date()
    };

    socket.emit("caretakerReply", { parentId: activeParent, message });
    setChat((prev) => [
      ...prev,
      newMessage,
    ]);
    setMessage("");

    // Add to localStorage for accumulation (will be saved to DB on export)
    const existingLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
    const updatedLogs = [...existingLogs, newMessage];
    localStorage.setItem('chatLogs', JSON.stringify(updatedLogs));
  };

  const handleTyping = () => {
    if (activeParent) socket.emit("typing", { role: "caretaker", parentId: activeParent });
  };

  const exportChatLogs = async () => {
    try {
      // Get all accumulated logs from localStorage
      const allLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');

      if (allLogs.length === 0) {
        toast.info('No chat logs to export');
        return;
      }

      // Convert logs to proper MongoDB format
      const mongoDBLogs = allLogs.map(log => ({
        parentId: log.parentId,
        sender: log.sender === 'caretaker' ? 'caretaker' : 'parent',
        message: log.message,
        timestamp: log.timestamp
      }));

      // Save to MongoDB via backend
      await axios.post(" https://whatsappclone-1-1r7l.onrender.com/save-chat-logs", { logs: mongoDBLogs });

      // Create downloadable log file
      const logText = allLogs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        return `[${timestamp}] ${log.sender === 'caretaker' ? 'CARETAKER' : log.parentId}: ${log.message}`;
      }).join('\n');

      const blob = new Blob([`CHAT LOG EXPORT - ${new Date().toLocaleString()}\n\n${logText}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Chat logs exported successfully! (${allLogs.length} messages saved to database)`);
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast.error('Failed to export chat logs');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  if (loading) {
    return <CSELoader />;
  }

  return (
    <div style={{ width: 600, margin: "auto", padding: 20, fontFamily: "Poppins" }}>
      <h3>👩‍🏫 Caretaker Dashboard</h3>

      {/* Export Logs Button */}
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <button
          onClick={exportChatLogs}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: 20,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold"
          }}
        >
          📥 Export Chat Logs
        </button>
      </div>

      <div style={{ display: "flex" }}>
        <div
          style={{
            width: "30%",
            borderRight: "1px solid gray",
            paddingRight: 10,
          }}
        >
          <h4>Parents</h4>
          {loading ? (
            <div>Loading parents...</div>
          ) : parents.length === 0 ? (
            <div>No parents found. Parents will appear here once they send messages.</div>
          ) : (
            parents.map((p) => (
              <div
                key={p}
                onClick={() => openChat(p)}
                style={{
                  margin: "8px 0",
                  cursor: "pointer",
                  fontWeight: p === activeParent ? "bold" : "normal",
                }}
              >
                {p} {typingParent === p && <span style={{ color: "green" }}>✍️ typing...</span>}
              </div>
            ))
          )}
        </div>

        <div style={{ width: "70%", paddingLeft: 10 }}>
          <h4>Chat with: {activeParent || "Select a parent"}</h4>
          <div
            style={{
              border: "1px solid gray",
              borderRadius: 10,
              height: 350,
              overflowY: "scroll",
              padding: 10,
              background: "#f9f9f9",
            }}
          >
            {chat.map((msg, i) => (
              <div key={i} style={{ textAlign: msg.sender === "caretaker" ? "right" : "left" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: 15,
                    background: msg.sender === "caretaker" ? "#DCF8C6" : "#EAEAEA",
                    marginBottom: "8px",
                  }}
                >
                  {msg.message}
                </div>
                <div style={{ fontSize: "10px", color: "gray" }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleTyping}
            placeholder="Type reply..."
            style={{ width: "70%", borderRadius: 20, padding: 8 }}
          />
          <button onClick={sendReply}>Send</button>
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default CaretakerChat;

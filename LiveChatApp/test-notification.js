// Test Push Notification from Render Backend
// Run this after logging in as a student to test notifications

import axios from 'axios';

const RENDER_URL = 'https://whatsappclone-1-1r7l.onrender.com';

// Step 1: Login as admin
async function loginAsAdmin() {
  try {
    const response = await axios.post(`${RENDER_URL}/api/admin/login`, {
      adminId: 'hod123',  // Change this to your admin ID
      password: 'hod123'  // Change this to your admin password
    });
    
    console.log('✅ Admin logged in successfully');
    return response.data.token;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return null;
  }
}

// Step 2: Send test message
async function sendTestMessage(token) {
  try {
    const response = await axios.post(
      `${RENDER_URL}/api/messages/send`,
      {
        senderId: 'hod123',
        message: '🔔 TEST NOTIFICATION: This is a test push notification with badge count!',
        batches: ['2022-2026'],  // Change to match your student's batch
        branches: ['CSE'],        // Change to match your student's branch
        section: null             // null = all sections
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Test message sent successfully!');
    console.log('Response:', response.data);
    
    console.log('\n📱 Check your student app for notification!');
    console.log('- If app is OPEN: You should see a toast notification');
    console.log('- If app is CLOSED: You should see a push notification with badge count');
  } catch (error) {
    console.error('❌ Failed to send message:', error.response?.data || error.message);
  }
}

// Run the test
async function runTest() {
  console.log('🚀 Starting push notification test...\n');
  
  console.log('Step 1: Logging in as admin...');
  const token = await loginAsAdmin();
  
  if (!token) {
    console.log('\n❌ Test failed: Could not login as admin');
    console.log('Make sure you have created an admin account first!');
    return;
  }
  
  console.log('\nStep 2: Sending test message to students...');
  await sendTestMessage(token);
}

// Execute
runTest();

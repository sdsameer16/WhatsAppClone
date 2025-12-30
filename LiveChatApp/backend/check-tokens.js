// Check if FCM tokens are stored in MongoDB
import mongoose from 'mongoose';
import Student from './models/Student.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkTokens() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all students with FCM tokens
    const studentsWithTokens = await Student.find({ 
      fcmTokens: { $exists: true, $ne: [] } 
    }).select('studentId name fcmTokens isOnline lastSeen');

    console.log(`Found ${studentsWithTokens.length} students with FCM tokens:\n`);

    studentsWithTokens.forEach((student, index) => {
      console.log(`${index + 1}. Student ID: ${student.studentId}`);
      console.log(`   Name: ${student.name}`);
      console.log(`   Online: ${student.isOnline}`);
      console.log(`   Tokens: ${student.fcmTokens.length}`);
      student.fcmTokens.forEach((token, i) => {
        console.log(`     ${i + 1}. ${token.substring(0, 40)}...`);
      });
      console.log('');
    });

    // Check for students without tokens
    const studentsWithoutTokens = await Student.countDocuments({
      $or: [
        { fcmTokens: { $exists: false } },
        { fcmTokens: { $size: 0 } }
      ]
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Students with tokens: ${studentsWithTokens.length}`);
    console.log(`   Students without tokens: ${studentsWithoutTokens}`);

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTokens();

// Add test FCM token to a student account
import mongoose from 'mongoose';
import Student from './models/Student.js';
import dotenv from 'dotenv';

dotenv.config();

const testToken = 'fo2BeiJ3S0aG3ExWXCHhby:APA91bFOYs0E1bWUzOuWZ0nkM9VI55kRV5Gt-Gg-K3KPu7djqKhnhBa-c8J6ozngwOfZ58tQYo_N-Ws5BPVF8nAObdPorrXFp6grElKlOD0Zz3WeN7Jh5RU';

async function addTestToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get first student
    const student = await Student.findOne();
    
    if (!student) {
      console.log('❌ No students found in database');
      console.log('Please register a student first!');
      await mongoose.connection.close();
      return;
    }

    console.log(`Found student: ${student.studentId} - ${student.name}`);
    console.log(`Current tokens: ${student.fcmTokens.length}`);
    
    // Add test token if not exists
    if (!student.fcmTokens.includes(testToken)) {
      student.fcmTokens.push(testToken);
      await student.save();
      console.log('✅ Test token added!');
    } else {
      console.log('ℹ️  Token already exists');
    }

    console.log(`\nStudent now has ${student.fcmTokens.length} token(s)`);
    console.log(`Student details:`);
    console.log(`  ID: ${student.studentId}`);
    console.log(`  Name: ${student.name}`);
    console.log(`  Branch: ${student.branch}`);
    console.log(`  Batch: ${student.batch}`);
    console.log(`  Section: ${student.section || 'Not assigned'}`);

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    console.log('\n📝 Now you can test by sending a message from admin to this student\'s batch/branch');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestToken();

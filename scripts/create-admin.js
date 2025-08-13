const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config({ path: '../.env.local' });
const MONGODB_URI = process.env.MONGODB_URI;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    console.log('🔐 Create New Admin User\n');
    
    const name = await askQuestion('Enter admin name: ');
    const email = await askQuestion('Enter admin email: ');
    const password = await askQuestion('Enter admin password: ');
    
    // Check if admin already exists
    const existingAdmin = await db.collection('admins').findOne({ email });
    if (existingAdmin) {
      console.log('❌ Admin with this email already exists!');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create admin
    await db.collection('admins').insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    });
    
    console.log('✅ Admin user created successfully!');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await client.close();
    rl.close();
  }
}

// Run the function
createAdmin();

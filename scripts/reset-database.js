const { MongoClient } = require('mongodb');
const readline = require('readline');
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

async function resetDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    console.log('⚠️  WARNING: This will delete ALL data in the database!');
    const confirm = await askQuestion('Are you sure you want to continue? (yes/no): ');
    
    if (confirm !== 'yes' && confirm !== 'y') {
      console.log('Operation cancelled.');
      return;
    }
    
    console.log('Resetting database...');
    
    // Drop all collections
    await db.collection('voters').deleteMany({});
    await db.collection('polls').deleteMany({});
    await db.collection('votes').deleteMany({});
    await db.collection('admins').deleteMany({});
    
    console.log('✅ Database reset successfully!');
    console.log('All collections have been cleared.');
    console.log('Run "npm run seed" to add sample data.');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await client.close();
    rl.close();
  }
}

// Run the function
resetDatabase();

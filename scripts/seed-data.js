const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

async function seedData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('Clearing existing data...');
    await db.collection('admins').deleteMany({});
    await db.collection('voters').deleteMany({});
    await db.collection('polls').deleteMany({});
    await db.collection('votes').deleteMany({});
    
    // Create admin user
    console.log('Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await db.collection('admins').insertOne({
      email: 'admin@votingsystem.com',
      password: adminPassword,
      name: 'System Administrator',
      createdAt: new Date()
    });
    
    // Create sample voters
    console.log('Creating sample voters...');
    const sampleVoters = [
      { name: 'John Doe', email: 'john.doe@student.edu', year: '1st', section: 'A', password: 'pass123', hasVoted: false },
      { name: 'Jane Smith', email: 'jane.smith@student.edu', year: '1st', section: 'A', password: 'pass456', hasVoted: false },
      { name: 'Mike Johnson', email: 'mike.johnson@student.edu', year: '1st', section: 'B', password: 'pass789', hasVoted: false },
      { name: 'Sarah Wilson', email: 'sarah.wilson@student.edu', year: '2nd', section: 'A', password: 'pass101', hasVoted: false },
      { name: 'David Brown', email: 'david.brown@student.edu', year: '2nd', section: 'B', password: 'pass202', hasVoted: false },
      { name: 'Lisa Davis', email: 'lisa.davis@student.edu', year: '3rd', section: 'A', password: 'pass303', hasVoted: false },
      { name: 'Tom Miller', email: 'tom.miller@student.edu', year: '3rd', section: 'B', password: 'pass404', hasVoted: false },
      { name: 'Amy Garcia', email: 'amy.garcia@student.edu', year: '4th', section: 'A', password: 'pass505', hasVoted: false },
    ];
    
    const votersWithTimestamp = sampleVoters.map(voter => ({
      ...voter,
      createdAt: new Date()
    }));
    
    await db.collection('voters').insertMany(votersWithTimestamp);
    
    // Create sample polls
    console.log('Creating sample polls...');
    const samplePolls = [
      {
        title: 'Class Representative Election - 1st Year A',
        description: 'Vote for your class representative for the academic year 2024-25',
        targetYear: '1st',
        targetSection: 'A',
        candidates: ['Alice Johnson', 'Bob Smith', 'Charlie Brown'],
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Student Council President - 2nd Year',
        description: 'Choose the student council president for 2nd year students',
        targetYear: '2nd',
        targetSection: 'A',
        candidates: ['Emma Wilson', 'James Davis', 'Olivia Taylor'],
        isActive: false,
        createdAt: new Date()
      },
      {
        title: 'Sports Captain Election - 3rd Year B',
        description: 'Select the sports captain for 3rd year section B',
        targetYear: '3rd',
        targetSection: 'B',
        candidates: ['Michael Chen', 'Sofia Rodriguez', 'Alex Thompson'],
        isActive: true,
        createdAt: new Date()
      }
    ];
    
    await db.collection('polls').insertMany(samplePolls);
    
    // Create indexes for better performance
    console.log('Creating database indexes...');
    await db.collection('voters').createIndex({ email: 1 }, { unique: true });
    await db.collection('polls').createIndex({ targetYear: 1, targetSection: 1 });
    await db.collection('votes').createIndex({ pollId: 1, voterId: 1 }, { unique: true });
    await db.collection('admins').createIndex({ email: 1 }, { unique: true });
    
    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Seeded Data Summary:');
    console.log(`- Admin users: 1`);
    console.log(`- Voters: ${sampleVoters.length}`);
    console.log(`- Polls: ${samplePolls.length}`);
    console.log('\n🔐 Admin Credentials:');
    console.log('Email: admin@votingsystem.com');
    console.log('Password: admin123');
    console.log('\n👥 Sample Voter Credentials:');
    sampleVoters.slice(0, 3).forEach(voter => {
      console.log(`${voter.name}: ${voter.email} / ${voter.password}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await client.close();
  }
}

// Run the seeding function
seedData();

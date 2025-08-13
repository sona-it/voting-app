const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Function to generate random password
function generatePassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Function to generate realistic names
function generateVoters(count = 50) {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Amy', 'Chris', 'Emma', 'Alex', 'Olivia', 'James', 'Sofia', 'Daniel', 'Maya', 'Ryan', 'Zoe', 'Kevin', 'Grace'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const years = ['1st', '2nd', '3rd', '4th'];
  const sections = ['A', 'B', 'C', 'D'];
  
  const voters = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const year = years[Math.floor(Math.random() * years.length)];
    const section = sections[Math.floor(Math.random() * sections.length)];
    
    voters.push({
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@student.edu`,
      year,
      section,
      password: generatePassword(),
      hasVoted: Math.random() > 0.7, // 30% chance of having voted
      createdAt: new Date()
    });
  }
  
  return voters;
}

async function seedDevData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB for development seeding');
    
    const db = client.db();
    
    // Create admin if doesn't exist
    const existingAdmin = await db.collection('admins').findOne({ email: 'admin@votingsystem.com' });
    if (!existingAdmin) {
      console.log('Creating admin user...');
      const adminPassword = await bcrypt.hash('admin123', 10);
      await db.collection('admins').insertOne({
        email: 'admin@votingsystem.com',
        password: adminPassword,
        name: 'System Administrator',
        createdAt: new Date()
      });
    }
    
    // Generate and insert voters
    console.log('Generating development voters...');
    const voters = generateVoters(100); // Generate 100 voters
    await db.collection('voters').insertMany(voters);
    
    // Create comprehensive polls for testing
    console.log('Creating development polls...');
    const devPolls = [
      {
        title: 'Student Body President Election',
        description: 'Vote for the next student body president',
        targetYear: '1st',
        targetSection: 'A',
        candidates: ['Alexandra Chen', 'Marcus Johnson', 'Priya Patel', 'Diego Martinez'],
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Class Representative - 2nd Year A',
        description: 'Choose your class representative',
        targetYear: '2nd',
        targetSection: 'A',
        candidates: ['Emma Thompson', 'Liam Wilson', 'Ava Garcia'],
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Sports Committee Head - 3rd Year',
        description: 'Select the head of sports committee',
        targetYear: '3rd',
        targetSection: 'B',
        candidates: ['Noah Brown', 'Isabella Davis', 'Ethan Miller', 'Mia Rodriguez'],
        isActive: false,
        createdAt: new Date()
      },
      {
        title: 'Cultural Committee Lead - 4th Year',
        description: 'Vote for cultural committee leadership',
        targetYear: '4th',
        targetSection: 'A',
        candidates: ['Sophia Lee', 'Jackson Taylor', 'Chloe Anderson'],
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Library Committee Representative',
        description: 'Choose library committee representative',
        targetYear: '2nd',
        targetSection: 'B',
        candidates: ['Aiden Thomas', 'Luna Martinez', 'Owen Wilson'],
        isActive: false,
        createdAt: new Date()
      }
    ];
    
    await db.collection('polls').insertMany(devPolls);
    
    // Create some sample votes for testing results
    console.log('Creating sample votes...');
    const polls = await db.collection('polls').find({}).toArray();
    const allVoters = await db.collection('voters').find({}).toArray();
    
    for (const poll of polls) {
      // Get eligible voters for this poll
      const eligibleVoters = allVoters.filter(voter => 
        voter.year === poll.targetYear && 
        voter.section === poll.targetSection &&
        voter.hasVoted
      );
      
      // Create votes for some eligible voters
      const votesToCreate = eligibleVoters.slice(0, Math.floor(eligibleVoters.length * 0.6));
      
      for (const voter of votesToCreate) {
        const randomCandidate = poll.candidates[Math.floor(Math.random() * poll.candidates.length)];
        
        try {
          await db.collection('votes').insertOne({
            pollId: poll._id,
            voterId: voter._id,
            candidate: randomCandidate,
            timestamp: new Date()
          });
        } catch (error) {
          // Skip if vote already exists (duplicate key error)
          if (error.code !== 11000) {
            console.error('Error creating vote:', error);
          }
        }
      }
    }
    
    // Create indexes
    console.log('Creating database indexes...');
    try {
      await db.collection('voters').createIndex({ email: 1 }, { unique: true });
      await db.collection('polls').createIndex({ targetYear: 1, targetSection: 1 });
      await db.collection('votes').createIndex({ pollId: 1, voterId: 1 }, { unique: true });
      await db.collection('admins').createIndex({ email: 1 }, { unique: true });
    } catch (error) {
      console.log('Indexes may already exist, continuing...');
    }
    
    // Get final counts
    const voterCount = await db.collection('voters').countDocuments();
    const pollCount = await db.collection('polls').countDocuments();
    const voteCount = await db.collection('votes').countDocuments();
    
    console.log('✅ Development database seeded successfully!');
    console.log('\n📊 Final Data Summary:');
    console.log(`- Total Voters: ${voterCount}`);
    console.log(`- Total Polls: ${pollCount}`);
    console.log(`- Total Votes Cast: ${voteCount}`);
    console.log('\n🔐 Admin Credentials:');
    console.log('Email: admin@votingsystem.com');
    console.log('Password: admin123');
    console.log('\n👥 Sample Voter Credentials (first 5):');
    
    const sampleVoters = await db.collection('voters').find({}).limit(5).toArray();
    sampleVoters.forEach(voter => {
      console.log(`${voter.name}: ${voter.email} / ${voter.password} (${voter.year} Year ${voter.section})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding development database:', error);
  } finally {
    await client.close();
  }
}

// Run the seeding function
seedDevData();

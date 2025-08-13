const { MongoClient } = require('mongodb');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateYear(year) {
  const validYears = ['1', '2', '3', '4'];
  return validYears.includes(year.toString());
}

function validateSection(section) {
  const validSections = ['A', 'B', 'C', 'D', 'E', 'F'];
  return validSections.includes(section.toUpperCase());
}

async function importVotersFromExcel(filePath) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Read Excel file
    console.log(`Reading Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} rows in Excel file`);
    
    // Process and validate data
    const voters = [];
    const errors = [];
    const duplicateRegs = new Set();
    const duplicateEmails = new Set();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (accounting for header)
      
      // Extract fields (handle different possible column names)
      const regNo = row.reg_no || row.registration_no || row.RegNo || row['Registration Number'];
      const name = row.name || row.Name || row.student_name || row['Student Name'];
      const email = row.email || row.Email || row.email_id || row['Email ID'];
      const year = row.year || row.Year || row.academic_year || row['Academic Year'];
      const section = row.section || row.Section || row.sec || row.Sec;
      const dept = row.dept || row.department || row.Department || row.branch || row.Branch;
      
      // Validate required fields
      if (!regNo) {
        errors.push(`Row ${rowNum}: Missing registration number`);
        continue;
      }
      
      if (!name) {
        errors.push(`Row ${rowNum}: Missing name`);
        continue;
      }
      
      if (!email) {
        errors.push(`Row ${rowNum}: Missing email`);
        continue;
      }
      
      if (!year) {
        errors.push(`Row ${rowNum}: Missing year`);
        continue;
      }
      
      if (!section) {
        errors.push(`Row ${rowNum}: Missing section`);
        continue;
      }
      
      if (!dept) {
        errors.push(`Row ${rowNum}: Missing department`);
        continue;
      }
      
      // Validate data formats
      if (!validateEmail(email)) {
        errors.push(`Row ${rowNum}: Invalid email format - ${email}`);
        continue;
      }
      
      if (!validateYear(year)) {
        errors.push(`Row ${rowNum}: Invalid year - ${year}. Must be 1, 2, 3, or 4`);
        continue;
      }
      
      if (!validateSection(section)) {
        errors.push(`Row ${rowNum}: Invalid section - ${section}. Must be A, B, C, D, E, or F`);
        continue;
      }
      
      // Check for duplicates in current batch
      if (duplicateRegs.has(regNo)) {
        errors.push(`Row ${rowNum}: Duplicate registration number - ${regNo}`);
        continue;
      }
      
      if (duplicateEmails.has(email)) {
        errors.push(`Row ${rowNum}: Duplicate email - ${email}`);
        continue;
      }
      
      duplicateRegs.add(regNo);
      duplicateEmails.add(email);
      
      voters.push({
        regNo: regNo.toString(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        year: year.toString(),
        section: section.toUpperCase().trim(),
        department: dept.trim(),
        password: generatePassword(),
        hasVoted: false,
        createdAt: new Date()
      });
    }
    
    if (errors.length > 0) {
      console.log('❌ Validation errors found:');
      errors.forEach(error => console.log(error));
      console.log(`\nFound ${errors.length} errors. Please fix them and try again.`);
      return;
    }
    
    // Check for existing voters in database
    console.log('Checking for existing voters...');
    const existingRegs = await db.collection('voters').find({
      regNo: { $in: voters.map(v => v.regNo) }
    }).toArray();
    
    const existingEmails = await db.collection('voters').find({
      email: { $in: voters.map(v => v.email) }
    }).toArray();
    
    if (existingRegs.length > 0) {
      console.log('❌ Found existing registration numbers:');
      existingRegs.forEach(voter => console.log(`- ${voter.regNo}: ${voter.name}`));
    }
    
    if (existingEmails.length > 0) {
      console.log('❌ Found existing emails:');
      existingEmails.forEach(voter => console.log(`- ${voter.email}: ${voter.name}`));
    }
    
    if (existingRegs.length > 0 || existingEmails.length > 0) {
      console.log('\nPlease remove duplicates and try again.');
      return;
    }
    
    // Insert voters
    console.log(`Inserting ${voters.length} voters...`);
    const result = await db.collection('voters').insertMany(voters);
    
    // Group by year and section for summary
    const groups = {};
    voters.forEach(voter => {
      const key = `${voter.year}-${voter.section}`;
      if (!groups[key]) {
        groups[key] = { year: voter.year, section: voter.section, count: 0, department: voter.department };
      }
      groups[key].count++;
    });
    
    console.log('✅ Voters imported successfully!');
    console.log(`Total inserted: ${result.insertedCount} voters`);
    console.log('\n📊 Summary by Year and Section:');
    Object.values(groups).forEach(group => {
      console.log(`- Year ${group.year}, Section ${group.section} (${group.department}): ${group.count} voters`);
    });
    
    // Display sample credentials
    console.log('\n👥 Sample Voter Credentials (first 5):');
    voters.slice(0, 5).forEach(voter => {
      console.log(`${voter.name} (${voter.regNo}): ${voter.email} / ${voter.password}`);
    });
    
  } catch (error) {
    if (error.code === 11000) {
      console.error('❌ Duplicate key error. Some voters may already exist in the database.');
    } else {
      console.error('❌ Error importing voters:', error);
    }
  } finally {
    await client.close();
  }
}

// Get file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node scripts/bulk-import-voters.js <path-to-excel-file>');
  console.log('Example: node scripts/bulk-import-voters.js ./data/voters.xlsx');
  console.log('\nExpected Excel columns:');
  console.log('- reg_no (Registration Number)');
  console.log('- name (Student Name)');
  console.log('- email (Email Address)');
  console.log('- year (Academic Year: 1, 2, 3, or 4)');
  console.log('- section (Section: A, B, C, D, E, or F)');
  console.log('- dept (Department)');
  process.exit(1);
}

if (!require('fs').existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

// Run the import
importVotersFromExcel(filePath);

# Database Seeding Guide

This guide explains how to seed your voting application database with sample data for development and testing.

## Available Seeding Scripts

### 1. Basic Seeding (`npm run seed`)
Seeds the database with minimal sample data:
- 1 admin user
- 8 sample voters across different years/sections
- 3 sample polls
- Database indexes

**Usage:**
\`\`\`bash
npm run seed
\`\`\`

**Credentials:**
- Admin: `admin@votingsystem.com` / `admin123`
- Sample voters with simple passwords (pass123, pass456, etc.)

### 2. Development Seeding (`npm run seed:dev`)
Seeds the database with comprehensive development data:
- 1 admin user
- 100 randomly generated voters
- 5 diverse polls
- Sample votes for testing results
- Database indexes

**Usage:**
\`\`\`bash
npm run seed:dev
\`\`\`

### 3. Create Admin Only (`npm run seed:admin`)
Interactive script to create a single admin user:

**Usage:**
\`\`\`bash
npm run seed:admin
\`\`\`

### 4. Bulk Import from Excel
Import voters from an Excel file:

**Usage:**
\`\`\`bash
node scripts/bulk-import-voters.js path/to/your/file.xlsx
\`\`\`

**Excel Format:**
Your Excel file should have these columns:
- `name` or `Name`
- `email` or `Email` 
- `year` or `Year`
- `section` or `Section`

### 5. Reset Database
Completely clear all data:

**Usage:**
\`\`\`bash
node scripts/reset-database.js
\`\`\`

## Step-by-Step Setup

### For Development:
1. Set up your environment variables in `.env.local`
2. Run development seeding:
   \`\`\`bash
   npm run seed:dev
   \`\`\`
3. Start your application:
   \`\`\`bash
   npm run dev
   \`\`\`

### For Production:
1. Create admin user:
   \`\`\`bash
   npm run seed:admin
   \`\`\`
2. Import your voter data:
   \`\`\`bash
   node scripts/bulk-import-voters.js voters.xlsx
   \`\`\`

## Sample Data Structure

### Voters
- Distributed across years (1st, 2nd, 3rd, 4th)
- Distributed across sections (A, B, C, D)
- Random passwords generated
- Some marked as having voted (for testing)

### Polls
- Different target audiences (year/section combinations)
- Mix of active and inactive polls
- Multiple candidates per poll
- Realistic titles and descriptions

### Votes
- Sample votes created for testing results
- Respects poll targeting rules
- No duplicate votes per voter per poll

## Environment Variables Required

\`\`\`env
MONGODB_URI=mongodb://localhost:27017/voting-system
JWT_SECRET=your-secret-key
\`\`\`

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MONGODB_URI in environment variables

2. **Duplicate Key Errors**
   - Normal when re-running scripts
   - Use reset script if needed

3. **Excel Import Errors**
   - Check column names match expected format
   - Ensure all required fields are present

### Reset and Start Over:
\`\`\`bash
node scripts/reset-database.js
npm run seed:dev
\`\`\`

## Database Indexes

The seeding scripts automatically create these indexes for performance:
- `voters.email` (unique)
- `polls.targetYear + targetSection`
- `votes.pollId + voterId` (unique)
- `admins.email` (unique)

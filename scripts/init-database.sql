-- This script initializes the MongoDB collections
-- Run this to set up the initial admin user

-- Create admin user (you'll need to hash the password)
-- db.admins.insertOne({
--   email: "admin@votingsystem.com",
--   password: "$2a$10$...", // bcrypt hash of "admin123"
--   name: "System Administrator",
--   createdAt: new Date()
-- })

-- Create indexes for better performance
-- db.voters.createIndex({ email: 1 }, { unique: true })
-- db.polls.createIndex({ targetYear: 1, targetSection: 1 })
-- db.votes.createIndex({ pollId: 1, voterId: 1 }, { unique: true })

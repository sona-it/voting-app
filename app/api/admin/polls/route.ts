import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const db = await connectDB()
    const polls = await db.collection('polls').find({}).toArray()
    
    // Get vote counts for each poll
    for (const poll of polls) {
      const votes = await db.collection('votes').find({ pollId: poll._id }).toArray()
      poll.votes = votes

      // Get eligible voter count (include department)
      let eligibleVotersFilter: any = { year: poll.targetYear };
      if (poll.targetSection && poll.targetSection !== 'ALL') {
        eligibleVotersFilter.section = poll.targetSection;
      }
      if (poll.targetDepartment && poll.targetDepartment !== 'ALL') {
        eligibleVotersFilter.department = poll.targetDepartment;
      }
      const eligibleVotersCount = await db.collection('voters').countDocuments(eligibleVotersFilter);
      poll.eligibleVotersCount = eligibleVotersCount;
    }
    
    return NextResponse.json({ success: true, polls })
  } catch (error) {
    console.error('Fetch polls error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch polls' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const pollData = await request.json()
    const db = await connectDB()
    
    // Validate poll data
    if (!pollData.title || !pollData.targetYear || !pollData.candidates || pollData.candidates.length === 0 || !pollData.targetDepartment) {
      return NextResponse.json({ success: false, message: 'Missing required fields' })
    }

    // Check if eligible voters exist
    let eligibleVotersFilter: any = { year: pollData.targetYear }
    if (pollData.targetSection && pollData.targetSection !== 'ALL') {
      eligibleVotersFilter.section = pollData.targetSection
    }
    if (pollData.targetDepartment && pollData.targetDepartment !== 'ALL') {
      eligibleVotersFilter.department = pollData.targetDepartment
    }

    const eligibleVotersCount = await db.collection('voters').countDocuments(eligibleVotersFilter)
    if (eligibleVotersCount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: `No eligible voters found for Year ${pollData.targetYear}${pollData.targetSection && pollData.targetSection !== 'ALL' ? `, Section ${pollData.targetSection}` : ''}${pollData.targetDepartment && pollData.targetDepartment !== 'ALL' ? `, Department ${pollData.targetDepartment}` : ''}`
      })
    }

    const poll = {
      ...pollData,
      isActive: false,
      createdAt: new Date(),
      createdBy: user.id,
      eligibleVotersCount
    }

    await db.collection('polls').insertOne(poll)

    return NextResponse.json({ success: true, eligibleVotersCount })
  } catch (error) {
    console.error('Create poll error:', error)
    return NextResponse.json({ success: false, message: 'Failed to create poll' }, { status: 500 })
  }
}

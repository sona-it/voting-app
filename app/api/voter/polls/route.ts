import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'voter') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const db = await connectDB()
    const voter = await db.collection('voters').findOne({ _id: new ObjectId(user.id) })
    
    if (!voter) {
      return NextResponse.json({ success: false, message: 'Voter not found' }, { status: 404 })
    }

    // Find polls for this voter's year, branch, and section
    // Include polls that target all branchs (targetbranch = 'ALL') or specific branch
    // and all sections (targetSection = 'ALL') or specific section
    const polls = await db.collection('polls').find({
      targetYear: voter.year,
      $and: [
        {
          $or: [
            { targetbranch: voter.branch },
            { targetbranch: 'ALL' },
            { targetbranch: '' },
            { targetbranch: { $exists: false } }
          ]
        },
        {
          $or: [
            { targetSection: voter.section },
            { targetSection: 'ALL' },
            { targetSection: '' },
            { targetSection: { $exists: false } }
          ]
        }
      ]
    }).toArray()

    // Check if voter has voted in each poll
    for (const poll of polls) {
      const vote = await db.collection('votes').findOne({
        pollId: poll._id,
        voterId: new ObjectId(user.id)
      })
      poll.hasVoted = !!vote
    }
    
    return NextResponse.json({ success: true, polls })
  } catch (error) {
    console.error('Fetch voter polls error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch polls' }, { status: 500 })
  }
}
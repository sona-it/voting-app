import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'voter') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { pollId, candidate } = await request.json()
    const db = await connectDB()

    // Check if poll exists and is active
    const poll = await db.collection('polls').findOne({ _id: new ObjectId(pollId) })
    if (!poll || !poll.isActive) {
      return NextResponse.json({ success: false, message: 'Poll is not active' })
    }

    // Check if voter has already voted
    const existingVote = await db.collection('votes').findOne({
      pollId: new ObjectId(pollId),
      voterId: new ObjectId(user.id)
    })

    if (existingVote) {
      return NextResponse.json({ success: false, message: 'You have already voted in this poll' })
    }

    // Record the vote
    await db.collection('votes').insertOne({
      pollId: new ObjectId(pollId),
      voterId: new ObjectId(user.id),
      candidate,
      timestamp: new Date()
    })

    // Update voter's hasVoted status
    await db.collection('voters').updateOne(
      { _id: new ObjectId(user.id) },
      { $set: { hasVoted: true } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ success: false, message: 'Failed to submit vote' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const db = await connectDB()
    const pollId = new ObjectId(params.id)
    
    // Check if poll exists
    const poll = await db.collection('polls').findOne({ _id: pollId })
    if (!poll) {
      return NextResponse.json({ success: false, message: 'Poll not found' }, { status: 404 })
    }
    
    // Delete all votes associated with this poll
    await db.collection('votes').deleteMany({ pollId })
    
    // Delete the poll
    await db.collection('polls').deleteOne({ _id: pollId })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Poll and all associated votes deleted successfully' 
    })
  } catch (error) {
    console.error('Delete poll error:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete poll' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, candidates, targetYear, targetSection, targetDepartment } = await request.json()
    const db = await connectDB()
    
    await db.collection('polls').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: { 
          title, 
          description, 
          candidates, 
          targetYear, 
          targetSection,
          targetDepartment,
          updatedAt: new Date()
        } 
      }
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update poll error:', error)
    return NextResponse.json({ success: false, message: 'Failed to update poll' }, { status: 500 })
  }
}

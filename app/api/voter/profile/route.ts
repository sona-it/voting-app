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
    
    return NextResponse.json({ success: true, voter })
  } catch (error) {
    console.error('Fetch voter profile error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch profile' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { isActive } = await request.json()
    const db = await connectDB()
    
    await db.collection('polls').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { isActive } }
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Toggle poll error:', error)
    return NextResponse.json({ success: false, message: 'Failed to toggle poll' }, { status: 500 })
  }
}

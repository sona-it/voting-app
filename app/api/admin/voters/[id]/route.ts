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
    await db.collection('voters').deleteOne({ _id: new ObjectId(params.id) })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete voter error:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete voter' }, { status: 500 })
  }
}

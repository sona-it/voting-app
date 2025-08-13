import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { voterId } = await request.json()
    const db = await connectDB()

    let voters
    if (voterId) {
      voters = await db.collection('voters').find({ _id: new ObjectId(voterId) }).toArray()
    } else {
      voters = await db.collection('voters').find({}).toArray()
    }

    for (const voter of voters) {
      const emailContent = `
        Dear ${voter.name},
        
        Your voting credentials:
        Email: ${voter.email}
        Password: ${voter.password}
        
        Please use these credentials to log in to the voting system.
        
        Best regards,
        Election Committee
      `
      
      await sendEmail(voter.email, 'Your Voting Credentials', emailContent)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send credentials error:', error)
    return NextResponse.json({ success: false, message: 'Failed to send credentials' }, { status: 500 })
  }
}

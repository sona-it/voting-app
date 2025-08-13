import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { action, voterIds, filters } = await request.json()
    const db = await connectDB()

    let targetVoters = []

    if (voterIds && voterIds.length > 0) {
      // Action on specific voters
      targetVoters = await db.collection('voters').find({
        _id: { $in: voterIds.map((id: string) => new ObjectId(id)) }
      }).toArray()
    } else if (filters) {
      // Action on filtered voters
      let filter: any = {}
      if (filters.year) filter.year = filters.year
      if (filters.section) filter.section = filters.section
      if (filters.department) filter.department = filters.department
      
      targetVoters = await db.collection('voters').find(filter).toArray()
    }

    if (targetVoters.length === 0) {
      return NextResponse.json({ success: false, message: 'No voters found' })
    }

    let result: any = { success: true, count: targetVoters.length }

    switch (action) {
      case 'send-credentials':
        let sentCount = 0
        for (const voter of targetVoters) {
          const emailContent = `
Dear ${voter.name},

Your voting credentials for the election system:

Registration Number: ${voter.regNo}
Email: ${voter.email}
Password: ${voter.password}
Year: ${voter.year}
Section: ${voter.section}
Department: ${voter.department}

Please use these credentials to log in to the voting system and cast your vote.

Login URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}

Best regards,
Election Committee
          `
          
          const emailSent = await sendEmail(
            voter.email, 
            'Your Voting Credentials - Election System', 
            emailContent
          )
          
          if (emailSent) sentCount++
        }
        
        result.sentCount = sentCount
        result.message = `Credentials sent to ${sentCount} out of ${targetVoters.length} voters`
        break

      case 'reset-passwords':
        const updates = targetVoters.map(voter => ({
          updateOne: {
            filter: { _id: voter._id },
            update: { $set: { password: generatePassword() } }
          }
        }))
        
        await db.collection('voters').bulkWrite(updates)
        result.message = `Passwords reset for ${targetVoters.length} voters`
        break

      case 'mark-voted':
        await db.collection('voters').updateMany(
          { _id: { $in: targetVoters.map(v => v._id) } },
          { $set: { hasVoted: true } }
        )
        result.message = `Marked ${targetVoters.length} voters as voted`
        break

      case 'mark-not-voted':
        await db.collection('voters').updateMany(
          { _id: { $in: targetVoters.map(v => v._id) } },
          { $set: { hasVoted: false } }
        )
        result.message = `Marked ${targetVoters.length} voters as not voted`
        break

      case 'delete':
        const voterObjectIds = targetVoters.map(v => v._id)
        await db.collection('voters').deleteMany({
          _id: { $in: voterObjectIds }
        })
        // Also delete their votes
        await db.collection('votes').deleteMany({
          voterId: { $in: voterObjectIds }
        })
        result.message = `Deleted ${targetVoters.length} voters and their votes`
        break

      default:
        return NextResponse.json({ success: false, message: 'Invalid action' })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json({ success: false, message: 'Bulk action failed' }, { status: 500 })
  }
}

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

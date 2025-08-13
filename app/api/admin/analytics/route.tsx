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

    // Get voter statistics
    const totalVoters = await db.collection('voters').countDocuments()
    const votedCount = await db.collection('voters').countDocuments({ hasVoted: true })
    const notVotedCount = totalVoters - votedCount

    // Get voters by year
    const votersByYear = await db.collection('voters').aggregate([
      {
        $group: {
          _id: '$year',
          total: { $sum: 1 },
          voted: { $sum: { $cond: ['$hasVoted', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray()

    // Get voters by department
    const votersByDepartment = await db.collection('voters').aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          voted: { $sum: { $cond: ['$hasVoted', 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray()

    // Get voters by year and section
    const votersByYearSection = await db.collection('voters').aggregate([
      {
        $group: {
          _id: { year: '$year', section: '$section' },
          total: { $sum: 1 },
          voted: { $sum: { $cond: ['$hasVoted', 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.section': 1 } }
    ]).toArray()

    // Get poll statistics
    const totalPolls = await db.collection('polls').countDocuments()
    const activePolls = await db.collection('polls').countDocuments({ isActive: true })
    const totalVotes = await db.collection('votes').countDocuments()

    // Get voting trends (votes per day for last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const votingTrends = await db.collection('votes').aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray()

    // Get most active polls
    const pollActivity = await db.collection('votes').aggregate([
      {
        $group: {
          _id: '$pollId',
          voteCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'polls',
          localField: '_id',
          foreignField: '_id',
          as: 'poll'
        }
      },
      {
        $unwind: '$poll'
      },
      {
        $project: {
          title: '$poll.title',
          voteCount: 1,
          targetYear: '$poll.targetYear',
          targetSection: '$poll.targetSection'
        }
      },
      { $sort: { voteCount: -1 } },
      { $limit: 10 }
    ]).toArray()

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalVoters,
          votedCount,
          notVotedCount,
          votingPercentage: totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0,
          totalPolls,
          activePolls,
          totalVotes
        },
        votersByYear,
        votersByDepartment,
        votersByYearSection,
        votingTrends,
        pollActivity
      }
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch analytics' }, { status: 500 })
  }
}

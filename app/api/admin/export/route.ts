import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'voters', 'results', 'analytics'
    const format = searchParams.get('format') || 'xlsx' // 'xlsx', 'csv'

    const db = await connectDB()

    let data: any[] = []
    let filename = ''

    switch (type) {
      case 'voters':
        const voters = await db.collection('voters').find({}).sort({ year: 1, section: 1, name: 1 }).toArray()
        data = voters.map(voter => ({
          'Registration Number': voter.regNo,
          'Name': voter.name,
          'Email': voter.email,
          'Year': voter.year,
          'Section': voter.section,
          'Department': voter.department,
          'Password': voter.password,
          'Has Voted': voter.hasVoted ? 'Yes' : 'No',
          'Created At': voter.createdAt?.toISOString()
        }))
        filename = `voters_${new Date().toISOString().split('T')[0]}`
        break

      case 'results':
        const polls = await db.collection('polls').find({}).toArray()
        const results = []
        
        for (const poll of polls) {
          const votes = await db.collection('votes').find({ pollId: poll._id }).toArray()
          const candidateVotes: any = {}
          
          poll.candidates.forEach((candidate: string) => {
            candidateVotes[candidate] = votes.filter(v => v.candidate === candidate).length
          })

          results.push({
            'Poll Title': poll.title,
            'Target Year': poll.targetYear,
            'Target Section': poll.targetSection === 'ALL' ? 'All Sections' : poll.targetSection,
            'Status': poll.isActive ? 'Active' : 'Closed',
            'Total Votes': votes.length,
            'Eligible Voters': poll.eligibleVotersCount || 0,
            'Turnout %': poll.eligibleVotersCount > 0 ? Math.round((votes.length / poll.eligibleVotersCount) * 100) : 0,
            ...candidateVotes,
            'Created At': poll.createdAt?.toISOString()
          })
        }
        
        data = results
        filename = `poll_results_${new Date().toISOString().split('T')[0]}`
        break

      case 'detailed-votes':
        const detailedVotes = await db.collection('votes').aggregate([
          {
            $lookup: {
              from: 'voters',
              localField: 'voterId',
              foreignField: '_id',
              as: 'voter'
            }
          },
          {
            $lookup: {
              from: 'polls',
              localField: 'pollId',
              foreignField: '_id',
              as: 'poll'
            }
          },
          {
            $unwind: '$voter'
          },
          {
            $unwind: '$poll'
          },
          {
            $project: {
              'Poll Title': '$poll.title',
              'Voter Reg No': '$voter.regNo',
              'Voter Name': '$voter.name',
              'Voter Year': '$voter.year',
              'Voter Section': '$voter.section',
              'Voter Department': '$voter.department',
              'Candidate Voted': '$candidate',
              'Vote Timestamp': '$timestamp'
            }
          }
        ]).toArray()
        
        data = detailedVotes
        filename = `detailed_votes_${new Date().toISOString().split('T')[0]}`
        break

      default:
        return NextResponse.json({ success: false, message: 'Invalid export type' })
    }

    if (data.length === 0) {
      return NextResponse.json({ success: false, message: 'No data to export' })
    }

    // Create workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: format as any })

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Disposition', `attachment; filename="${filename}.${format}"`)
    headers.set('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    return new NextResponse(buffer, { headers })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ success: false, message: 'Export failed' }, { status: 500 })
  }
}

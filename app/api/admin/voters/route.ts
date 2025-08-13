import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get('groupBy') // 'year-section' or 'year' or 'none'
    const year = searchParams.get('year')
    const section = searchParams.get('section')
    const department = searchParams.get('department')

    const db = await connectDB()
    
    // Build query filter
    let filter: any = {}
    if (year) filter.year = year
    if (section) filter.section = section
    if (department) filter.department = department
    
    const voters = await db.collection('voters').find(filter).sort({ year: 1, section: 1, name: 1 }).toArray()
    
    if (groupBy === 'year-section') {
      // Group by year and section
      const groups: any = {}
      voters.forEach(voter => {
        const key = `${voter.year}-${voter.section}-${voter.department}`
        if (!groups[key]) {
          groups[key] = {
            year: voter.year,
            section: voter.section,
            department: voter.department,
            voters: [],
            totalCount: 0,
            votedCount: 0
          }
        }
        groups[key].voters.push(voter)
        groups[key].totalCount++
        if (voter.hasVoted) groups[key].votedCount++
      })
      
      return NextResponse.json({ success: true, groups: Object.values(groups) })
    } else if (groupBy === 'year') {
      // Group by year only
      const groups: any = {}
      voters.forEach(voter => {
        const key = voter.year
        if (!groups[key]) {
          groups[key] = {
            year: voter.year,
            voters: [],
            totalCount: 0,
            votedCount: 0,
            sections: new Set()
          }
        }
        groups[key].voters.push(voter)
        groups[key].totalCount++
        groups[key].sections.add(voter.section)
        if (voter.hasVoted) groups[key].votedCount++
      })
      
      // Convert sections Set to Array
      Object.values(groups).forEach((group: any) => {
        group.sections = Array.from(group.sections).sort()
      })
      
      return NextResponse.json({ success: true, groups: Object.values(groups) })
    } else {
      // Return all voters without grouping
      return NextResponse.json({ success: true, voters })
    }
  } catch (error) {
    console.error('Fetch voters error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch voters' }, { status: 500 })
  }
}

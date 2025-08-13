export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const db = await connectDB()
    const body = await request.json()
    if (!body.regNo) {
      return NextResponse.json({ success: false, message: 'regNo is required' }, { status: 400 })
    }
    // Find the voter by regNo only (case-insensitive, uppercase regNo)
    const filter = { regNo: body.regNo.toUpperCase() }
    const updateFields: any = {}
    if (body.name) updateFields.name = body.name.toUpperCase()
    if (body.year) updateFields.year = body.year
    if (body.section) updateFields.section = body.section.toUpperCase()
    if (body.department) updateFields.department = body.department.toUpperCase()
    if (body.hasVoted !== undefined) updateFields.hasVoted = body.hasVoted
    if (body.email) updateFields.email = body.email
    // Regenerate password on update
    const newPassword = generateRandomPassword(10)
    updateFields.password = newPassword
    const result = await db.collection('voters').updateOne(
      filter,
      { $set: updateFields }
    )
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Voter not found' }, { status: 404 })
    }
    // Return the updated voter
    const updatedVoter = await db.collection('voters').findOne(filter)
    return NextResponse.json({ success: true, voter: updatedVoter })
  } catch (error) {
    console.error('Update voter error:', error)
    return NextResponse.json({ success: false, message: 'Failed to update voter' }, { status: 500 })
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const db = await connectDB()
    const body = await request.json()
    if (!body.regNo || !body.email) {
      return NextResponse.json({ success: false, message: 'regNo and email are required' }, { status: 400 })
    }
    const result = await db.collection('voters').deleteOne({ regNo: body.regNo, email: body.email })
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Voter not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete voter error:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete voter' }, { status: 500 })
  }
}
import crypto from 'crypto'
// Helper to generate a random password
function generateRandomPassword(length = 10) {
  return crypto.randomBytes(length).toString('base64').slice(0, length)
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const db = await connectDB()
    const body = await request.json()
    // If password is not provided, generate one
    const password = body.password || generateRandomPassword(10)
    const newVoter = {
      regNo: body.regNo?.toUpperCase() || '',
      name: body.name?.toUpperCase() || '',
      email: body.email,
      year: body.year,
      section: body.section?.toUpperCase() || '',
      department: body.department?.toUpperCase() || '',
      password,
      hasVoted: false
    }
    // Check for duplicate regNo or email
    const exists = await db.collection('voters').findOne({ $or: [ { regNo: newVoter.regNo }, { email: newVoter.email } ] })
    if (exists) {
      return NextResponse.json({ success: false, message: 'Voter with this regNo or email already exists' }, { status: 400 })
    }
    await db.collection('voters').insertOne(newVoter)
    return NextResponse.json({ success: true, voter: newVoter })
  } catch (error) {
    console.error('Add voter error:', error)
    return NextResponse.json({ success: false, message: 'Failed to add voter' }, { status: 500 })
  }
}
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
  const regNo = searchParams.get('regNo')
  const email = searchParams.get('email')
  if (regNo) filter.regNo = regNo.toUpperCase()
  if (email) filter.email = email
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

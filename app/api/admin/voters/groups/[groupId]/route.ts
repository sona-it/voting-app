import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'

export async function DELETE(request: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = params
    const db = await connectDB()
    
    // Parse groupId (format: "year-section-department", "year-section", "year-department", or "year")
    let filter: any = {}
    const parts = groupId.split('-')
    if (parts.length === 3) {
      // Year-Section-Department (e.g., "3-A-ADS")
      const [year, section, department] = parts
      filter = { year, section, department }
    } else if (parts.length === 2) {
      // Could be Year-Section or Year-Department
      const [first, second] = parts
      if (["A","B","C","D","E","F"].includes(second)) {
        // Year-Section
        filter = { year: first, section: second }
      } else {
        // Year-Department
        filter = { year: first, department: second }
      }
    } else {
      // Year only
      filter = { year: groupId }
    }
    
    // Get voters to be deleted for logging
    const votersToDelete = await db.collection('voters').find(filter).toArray()
    
    if (votersToDelete.length === 0) {
      return NextResponse.json({ success: false, message: 'No voters found for this group' })
    }
    
    // Delete voters
    const result = await db.collection('voters').deleteMany(filter)
    
    // Also delete any votes by these voters
    const voterIds = votersToDelete.map(v => v._id)
    await db.collection('votes').deleteMany({ voterId: { $in: voterIds } })
    
    console.log(`Deleted ${result.deletedCount} voters from group ${groupId}`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} voters`
    })
  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete group' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import * as XLSX from 'xlsx'

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.type !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    const db = await connectDB()
    const voters = []
    const errors = []
    let totalRowsProcessed = 0

    // Process all sheets in the workbook
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet)
      
      // Skip empty sheets
      if (data.length === 0) {
        continue
      }

      for (let i = 0; i < data.length; i++) {
        const row: any = data[i]
        const rowNum = i + 2
        totalRowsProcessed++

      // Extract fields with multiple possible column names
      const regNo = row.reg_no || row.registration_no || row.RegNo || row['Register Number']
      const name = row.name || row.Name || row.student_name || row['Student Name']
      const email = row.email || row.Email || row.email_id || row['Email ID'] || row['Student Sonatech Mail ID']
      const year = row.year || row.Year || row.academic_year || row['Academic Year'] 
      const section = row.section || row.Section || row.sec || row.Sec
      const dept = row.dept || row.department || row.Department || row.branch || row.Branch

      // Validate required fields
      if (!regNo) {
        errors.push(`Row ${rowNum}: Missing registration number`)
        continue
      }
      if (!name) {
        errors.push(`Row ${rowNum}: Missing name`)
        continue
      }
      if (!email) {
        errors.push(`Row ${rowNum}: Missing email`)
        continue
      }
      if (!year) {
        errors.push(`Row ${rowNum}: Missing year`)
        continue
      }
      if (!section) {
        errors.push(`Row ${rowNum}: Missing section`)
        continue
      }
      if (!dept) {
        errors.push(`Row ${rowNum}: Missing department`)
        continue
      }

      // Validate formats
      if (!validateEmail(email)) {
        errors.push(`Row ${rowNum}: Invalid email format`)
        continue
      }

      if (!['1', '2', '3', '4'].includes(year.toString())) {
        errors.push(`Row ${rowNum}: Invalid year (must be 1, 2, 3, or 4)`)
        continue
      }

        voters.push({
          regNo: regNo.toString(),
          name: name.trim(),
          email: email.toLowerCase().trim(),
          year: year.toString(),
          section: section.toUpperCase().trim(),
          department: dept.trim(),
          password: generatePassword(),
          hasVoted: false,
          createdAt: new Date(),
          sheetName: sheetName // Add sheet name for reference
        })
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: `Found ${errors.length} validation errors across ${workbook.SheetNames.length} sheets`,
        errors: errors.slice(0, 10), // Return first 10 errors
        sheetsProcessed: workbook.SheetNames.length,
        totalRowsProcessed
      })
    }

    // Check for duplicates
    const regNos = voters.map(v => v.regNo)
    const emails = voters.map(v => v.email)
    
    const existingVoters = await db.collection('voters').find({
      $or: [
        { regNo: { $in: regNos } },
        { email: { $in: emails } }
      ]
    }).toArray()

    if (existingVoters.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: `Found ${existingVoters.length} existing voters with duplicate registration numbers or emails`
      })
    }

    await db.collection('voters').insertMany(voters)
    
    return NextResponse.json({ 
      success: true, 
      count: voters.length,
      sheetsProcessed: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
      totalRowsProcessed
    })
  } catch (error) {
    console.error('Upload voters error:', error)
    return NextResponse.json({ success: false, message: 'Failed to upload voters' }, { status: 500 })
  }
}
// import { NextRequest, NextResponse } from 'next/server'
// import { connectDB } from '@/lib/mongodb'
// import { verifyToken } from '@/lib/auth'
// import * as XLSX from 'xlsx'

// function generatePassword(length = 8) {
//   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
//   let result = ''
//   for (let i = 0; i < length; i++) {
//     result += chars.charAt(Math.floor(Math.random() * chars.length))
//   }
//   return result
// }

// function validateEmail(email: string) {
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
//   return emailRegex.test(email)
// }

// export async function POST(request: NextRequest) {
//   try {
//     const user = await verifyToken(request)
//     if (!user || user.type !== 'admin') {
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
//     }

//     const formData = await request.formData()
//     const file = formData.get('file') as File
    
//     if (!file) {
//       return NextResponse.json({ success: false, message: 'No file uploaded' })
//     }

//     const buffer = Buffer.from(await file.arrayBuffer())
//     const workbook = XLSX.read(buffer, { type: 'buffer' })
//     const sheetName = workbook.SheetNames[0]
//     const worksheet = workbook.Sheets[sheetName]
//     const data = XLSX.utils.sheet_to_json(worksheet)

//     const db = await connectDB()
//     const voters = []
//     const errors = []

//     for (let i = 0; i < data.length; i++) {
//       const row: any = data[i]
//       const rowNum = i + 2

//       // Extract fields with multiple possible column names
//       const regNo = row.reg_no || row.registration_no || row.RegNo || row['Register Number']
//       const name = row.name || row.Name || row.student_name || row['Student Name']
//       const email = row.email || row.Email || row.email_id || row['Email ID'] || row['Student Sonatech Mail ID']
//       const year = row.year || row.Year || row.academic_year || row['Academic Year'] 
//       const section = row.section || row.Section || row.sec || row.Sec
//       const dept = row.dept || row.department || row.Department || row.branch || row.Branch

//       // Validate required fields
//       if (!regNo) {
//         errors.push(`Row ${rowNum}: Missing registration number`)
//         continue
//       }
//       if (!name) {
//         errors.push(`Row ${rowNum}: Missing name`)
//         continue
//       }
//       if (!email) {
//         errors.push(`Row ${rowNum}: Missing email`)
//         continue
//       }
//       if (!year) {
//         errors.push(`Row ${rowNum}: Missing year`)
//         continue
//       }
//       if (!section) {
//         errors.push(`Row ${rowNum}: Missing section`)
//         continue
//       }
//       if (!dept) {
//         errors.push(`Row ${rowNum}: Missing department`)
//         continue
//       }

//       // Validate formats
//       if (!validateEmail(email)) {
//         errors.push(`Row ${rowNum}: Invalid email format`)
//         continue
//       }

//       if (!['1', '2', '3', '4'].includes(year.toString())) {
//         errors.push(`Row ${rowNum}: Invalid year (must be 1, 2, 3, or 4)`)
//         continue
//       }

//       voters.push({
//         regNo: regNo.toString(),
//         name: name.trim(),
//         email: email.toLowerCase().trim(),
//         year: year.toString(),
//         section: section.toUpperCase().trim(),
//         department: dept.trim(),
//         password: generatePassword(),
//         hasVoted: false,
//         createdAt: new Date()
//       })
//     }

//     if (errors.length > 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: `Found ${errors.length} validation errors`,
//         errors: errors.slice(0, 10) // Return first 10 errors
//       })
//     }

//     // Check for duplicates
//     const regNos = voters.map(v => v.regNo)
//     const emails = voters.map(v => v.email)
    
//     const existingVoters = await db.collection('voters').find({
//       $or: [
//         { regNo: { $in: regNos } },
//         { email: { $in: emails } }
//       ]
//     }).toArray()

//     if (existingVoters.length > 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: `Found ${existingVoters.length} existing voters with duplicate registration numbers or emails`
//       })
//     }

//     await db.collection('voters').insertMany(voters)
    
//     return NextResponse.json({ success: true, count: voters.length })
//   } catch (error) {
//     console.error('Upload voters error:', error)
//     return NextResponse.json({ success: false, message: 'Failed to upload voters' }, { status: 500 })
//   }
// }

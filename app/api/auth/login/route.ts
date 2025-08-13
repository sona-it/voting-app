import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password, type } = await request.json()
    const db = await connectDB()

    if (type === 'admin') {
      // Check admin credentials (you can modify this logic)
      const admin = await db.collection('admins').findOne({ email })
      if (!admin || !await bcrypt.compare(password, admin.password)) {
        return NextResponse.json({ success: false, message: 'Invalid credentials' })
      }

      const token = jwt.sign({ id: admin._id, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' })
      return NextResponse.json({ success: true, token, user: admin })
    } else {
      // Check voter credentials
      const voter = await db.collection('voters').findOne({ email })
      if (!voter || voter.password !== password) {
        return NextResponse.json({ success: false, message: 'Invalid credentials' })
      }

      const token = jwt.sign({ id: voter._id, type: 'voter' }, JWT_SECRET, { expiresIn: '24h' })
      return NextResponse.json({ success: true, token, user: voter })
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 })
  }
}

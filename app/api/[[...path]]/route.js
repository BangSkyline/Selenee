import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

const client = new MongoClient(process.env.MONGO_URL)
const JWT_SECRET = process.env.JWT_SECRET

// Database connection
async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect()
  }
  return client.db(process.env.DB_NAME)
}

// Initialize database with default data
async function initializeDatabase() {
  try {
    const db = await connectDB()
    
    // Check if admin user exists
    const adminExists = await db.collection('users').findOne({ username: 'admin' })
    
    if (!adminExists) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin', 10)
      await db.collection('users').insertOne({
        id: uuidv4(),
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date()
      })
      console.log('Default admin user created')
    }

    // Check if resources exist
    const resourceCount = await db.collection('resources').countDocuments()
    
    if (resourceCount === 0) {
      // Create default resources
      const defaultResources = [
        {
          id: uuidv4(),
          name: 'Athéna',
          type: 'meeting_room',
          createdAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'Héra',
          type: 'meeting_room',
          createdAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'Hephaïstos',
          type: 'supercomputer',
          createdAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'Artémis',
          type: 'supercomputer',
          createdAt: new Date()
        }
      ]
      
      await db.collection('resources').insertMany(defaultResources)
      console.log('Default resources created')
    }
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}

// Auth middleware
function authMiddleware(handler) {
  return async (request, { params }) => {
    try {
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
      }

      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, JWT_SECRET)
      
      const db = await connectDB()
      const user = await db.collection('users').findOne({ id: decoded.userId })
      
      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }

      request.user = { id: user.id, username: user.username, role: user.role }
      return handler(request, { params })
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  }
}

// Admin middleware
function adminMiddleware(handler) {
  return authMiddleware(async (request, { params }) => {
    if (request.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return handler(request, { params })
  })
}

// Check reservation conflicts
async function checkReservationConflict(db, resourceId, date, startTime, duration, excludeReservationId = null) {
  const startDateTime = new Date(`${date}T${startTime}:00`)
  const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000)
  
  const query = {
    resourceId,
    date,
    $or: [
      {
        $and: [
          { startTime: { $lte: startTime } },
          { $expr: { $gte: [{ $dateFromString: { dateString: { $concat: ["$date", "T", "$startTime", ":00"] } } }, startDateTime] } }
        ]
      },
      {
        $and: [
          { startTime: { $gte: startTime } },
          { $expr: { $lt: [{ $dateFromString: { dateString: { $concat: ["$date", "T", "$startTime", ":00"] } } }, endDateTime] } }
        ]
      }
    ]
  }
  
  if (excludeReservationId) {
    query.id = { $ne: excludeReservationId }
  }
  
  // Simplified conflict check - check if any reservation overlaps with the requested time
  const existingReservations = await db.collection('reservations').find({
    resourceId,
    date
  }).toArray()
  
  for (const reservation of existingReservations) {
    if (excludeReservationId && reservation.id === excludeReservationId) continue
    
    const existingStart = new Date(`${reservation.date}T${reservation.startTime}:00`)
    const existingEnd = new Date(existingStart.getTime() + parseFloat(reservation.duration) * 60 * 60 * 1000)
    
    // Check if there's any overlap
    if (startDateTime < existingEnd && endDateTime > existingStart) {
      return true // Conflict found
    }
  }
  
  return false // No conflict
}

export async function GET(request, { params }) {
  await initializeDatabase()
  
  const path = params.path?.join('/') || ''
  const url = new URL(request.url)
  
  try {
    // Auth endpoints
    if (path === 'auth/profile') {
      return authMiddleware(async (request) => {
        return NextResponse.json({
          id: request.user.id,
          username: request.user.username,
          role: request.user.role
        })
      })(request, { params })
    }
    
    // Resources endpoint
    if (path === 'resources') {
      return authMiddleware(async (request) => {
        const db = await connectDB()
        const resources = await db.collection('resources').find({}).toArray()
        return NextResponse.json(resources)
      })(request, { params })
    }
    
    // Reservations endpoint
    if (path === 'reservations') {
      return authMiddleware(async (request) => {
        const db = await connectDB()
        
        // Get user's reservations with resource details
        const reservations = await db.collection('reservations').aggregate([
          { $match: { userId: request.user.id } },
          {
            $lookup: {
              from: 'resources',
              localField: 'resourceId',
              foreignField: 'id',
              as: 'resource'
            }
          },
          { $unwind: '$resource' },
          { $sort: { date: 1, startTime: 1 } }
        ]).toArray()
        
        return NextResponse.json(reservations)
      })(request, { params })
    }
    
    // Users endpoint (admin only)
    if (path === 'users') {
      return adminMiddleware(async (request) => {
        const db = await connectDB()
        const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray()
        return NextResponse.json(users)
      })(request, { params })
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
  } catch (error) {
    console.error('GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  await initializeDatabase()
  
  const path = params.path?.join('/') || ''
  
  try {
    // Login endpoint
    if (path === 'auth/login') {
      const { username, password } = await request.json()
      
      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
      }
      
      const db = await connectDB()
      const user = await db.collection('users').findOne({ username })
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' })
      
      return NextResponse.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      })
    }
    
    // Create reservation endpoint
    if (path === 'reservations') {
      return authMiddleware(async (request) => {
        const { resourceId, date, startTime, duration } = await request.json()
        
        if (!resourceId || !date || !startTime || !duration) {
          return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
        }
        
        const db = await connectDB()
        
        // Check if resource exists
        const resource = await db.collection('resources').findOne({ id: resourceId })
        if (!resource) {
          return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
        }
        
        // Check for conflicts
        const hasConflict = await checkReservationConflict(db, resourceId, date, startTime, parseFloat(duration))
        if (hasConflict) {
          return NextResponse.json({ error: 'Time slot already reserved' }, { status: 409 })
        }
        
        // Create reservation
        const reservation = {
          id: uuidv4(),
          userId: request.user.id,
          resourceId,
          date,
          startTime,
          duration,
          createdAt: new Date()
        }
        
        await db.collection('reservations').insertOne(reservation)
        
        return NextResponse.json(reservation, { status: 201 })
      })(request, { params })
    }
    
    // Create user endpoint (admin only)
    if (path === 'users') {
      return adminMiddleware(async (request) => {
        const { username, password, role } = await request.json()
        
        if (!username || !password || !role) {
          return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
        }
        
        if (!['user', 'admin'].includes(role)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }
        
        const db = await connectDB()
        
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ username })
        if (existingUser) {
          return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
        }
        
        // Create user
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = {
          id: uuidv4(),
          username,
          password: hashedPassword,
          role,
          createdAt: new Date()
        }
        
        await db.collection('users').insertOne(user)
        
        return NextResponse.json({
          id: user.id,
          username: user.username,
          role: user.role
        }, { status: 201 })
      })(request, { params })
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
  } catch (error) {
    console.error('POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  await initializeDatabase()
  
  const path = params.path?.join('/') || ''
  
  try {
    // Delete reservation endpoint
    if (path.startsWith('reservations/')) {
      const reservationId = path.split('/')[1]
      
      return authMiddleware(async (request) => {
        const db = await connectDB()
        
        // Find reservation
        const reservation = await db.collection('reservations').findOne({ id: reservationId })
        if (!reservation) {
          return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
        }
        
        // Check if user owns the reservation or is admin
        if (reservation.userId !== request.user.id && request.user.role !== 'admin') {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        
        // Delete reservation
        await db.collection('reservations').deleteOne({ id: reservationId })
        
        return NextResponse.json({ message: 'Reservation deleted' })
      })(request, { params })
    }
    
    // Delete user endpoint (admin only)
    if (path.startsWith('users/')) {
      const userId = path.split('/')[1]
      
      return adminMiddleware(async (request) => {
        const db = await connectDB()
        
        // Find user
        const user = await db.collection('users').findOne({ id: userId })
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        
        // Prevent deleting admin user
        if (user.username === 'admin') {
          return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 400 })
        }
        
        // Delete user and their reservations
        await db.collection('users').deleteOne({ id: userId })
        await db.collection('reservations').deleteMany({ userId })
        
        return NextResponse.json({ message: 'User deleted' })
      })(request, { params })
    }
    
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
  } catch (error) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
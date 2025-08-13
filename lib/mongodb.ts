import { MongoClient, Db } from 'mongodb'

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectDB(): Promise<Db> {
  if (cachedClient && cachedDb) {
    return cachedDb
  }

  const client = new MongoClient(MONGODB_URI)
  await client.connect()

  const db = client.db()

  cachedClient = client
  cachedDb = db

  return db
}

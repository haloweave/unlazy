import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// For development, we'll use drizzle-kit push instead of migrations
// You'll need to set DATABASE_URL with your Supabase connection string
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL not found in environment variables')
} else {
  console.log('Database URL found, attempting connection...')
}

// Create the connection only if DATABASE_URL exists
let client: postgres.Sql | null = null
let db: ReturnType<typeof drizzle> | null = null

if (connectionString) {
  try {
    client = postgres(connectionString, { 
      max: 1,
      prepare: false,
      connection: {
        application_name: 'unlazy-ai'
      }
    })

    // Create the drizzle instance with schema
    db = drizzle(client, { schema })
    console.log('Database connection established successfully')
  } catch (error) {
    console.error('Failed to create database connection:', error)
  }
}

// Export the db instance (will be null if no connection)
export { db }
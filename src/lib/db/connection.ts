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
    console.log('Attempting to connect to database with URL:', connectionString.substring(0, 30) + '...')
    
    client = postgres(connectionString, { 
      max: 5,
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connection: {
        application_name: 'unlazy-ai'
      },
      // Handle connection errors gracefully
      onnotice: () => {}, // Suppress notices
      debug: process.env.NODE_ENV === 'development'
    })

    // Create the drizzle instance with schema
    db = drizzle(client, { schema })
    console.log('Database connection established successfully')
    
    // Test the connection
    client`SELECT 1`.then(() => {
      console.log('Database connection test successful')
    }).catch((error) => {
      console.error('Database connection test failed:', error)
      // Don't fail completely, just log the error
    })
    
  } catch (error) {
    console.error('Failed to create database connection:', error)
    console.error('Connection string starts with:', connectionString.substring(0, 30))
  }
}

// Export the db instance (will be null if no connection)
export { db }
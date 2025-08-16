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

// Retry function for database operations
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: unknown) {
      if (i === maxRetries - 1) throw error
      
      // Only retry on connection errors
      if (error instanceof Error && 'code' in error && 
          (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
        console.log(`Database operation failed, retrying (${i + 1}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
      } else {
        throw error // Don't retry on other errors
      }
    }
  }
  throw new Error('Max retries exceeded')
}

if (connectionString) {
  try {
    console.log('Attempting to connect to database with URL:', connectionString.substring(0, 30) + '...')
    
    client = postgres(connectionString, { 
      max: 30,
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connection: {
        application_name: 'unlazy-ai'
      },
      // Handle connection errors gracefully
      onnotice: () => {}, // Suppress notices
      debug: process.env.NODE_ENV === 'development',
      // Add connection retry settings
      connect_timeout: 30
    })

    // Create the drizzle instance with schema
    db = drizzle(client, { schema })
    console.log('Database connection established successfully')
    
    // Test the connection with retry
    withRetry(async () => {
      await client!`SELECT 1`
      console.log('Database connection test successful')
    }).catch((error) => {
      console.error('Database connection test failed after retries:', error)
      // Don't fail completely, just log the error
    })
    
  } catch (error) {
    console.error('Failed to create database connection:', error)
    console.error('Connection string starts with:', connectionString.substring(0, 30))
  }
}

// Export the db instance (will be null if no connection)
export { db }
import { db } from './connection'
import { users } from './schema'
import { eq } from 'drizzle-orm'

export async function ensureUserExists(clerkUserId: string, email: string) {
  try {
    // Check if database is available
    if (!db) {
      console.warn('Database not available, skipping user creation')
      return null
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1)

    if (existingUser.length > 0) {
      return existingUser[0]
    }

    // Create new user if doesn't exist
    const [newUser] = await db
      .insert(users)
      .values({
        clerkUserId,
        email,
      })
      .returning()

    return newUser
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    throw error
  }
}
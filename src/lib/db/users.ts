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
      console.log(`User ${clerkUserId} found in database`)
      return existingUser[0]
    }

    // Create new user if doesn't exist (this handles previously logged in users)
    console.log(`Creating new user ${clerkUserId} in database`)
    const [newUser] = await db
      .insert(users)
      .values({
        clerkUserId,
        email,
      })
      .returning()

    console.log(`User ${clerkUserId} created successfully`)
    return newUser
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    // Don't throw error, return null to allow fallback behavior
    return null
  }
}

export async function updateUserNewsletterStatus(
  clerkUserId: string,
  newsletterDialogShown: boolean,
  newsletterSubscribed: boolean
) {
  try {
    if (!db) {
      console.warn('Database not available, skipping newsletter status update')
      return null
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        newsletterDialogShown,
        newsletterSubscribed,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, clerkUserId))
      .returning()

    console.log(`User ${clerkUserId} newsletter status updated successfully`)
    return updatedUser
  } catch (error) {
    console.error('Error updating user newsletter status:', error)
    return null
  }
}
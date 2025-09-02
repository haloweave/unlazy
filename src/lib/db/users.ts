import { db, withRetry } from './connection'
import { users } from './schema'
import { eq, count, sql } from 'drizzle-orm'
import { sendWhatsAppNotification } from '../whatsapp'

export async function ensureUserExists(clerkUserId: string, email: string) {
  try {
    // Check if database is available
    if (!db) {
      console.warn('Database not available, skipping user creation')
      return null
    }

    // Check if user already exists with retry
    const existingUser = await withRetry(async () => {
      return await db!
        .select()
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1)
    })

    if (existingUser.length > 0) {
      return existingUser[0]
    }

    // Create new user if doesn't exist (this handles previously logged in users)
    const [newUser] = await withRetry(async () => {
      return await db!
        .insert(users)
        .values({
          clerkUserId,
          email,
        })
        .returning()
    })

    
    // Send WhatsApp notification for new user registration
    const notificationNumber = process.env.WHATSAPP_NOTIFICATION_NUMBER || "19298995822";
    try {
      const totalUsers = await getTotalUserCount();
      await sendWhatsAppNotification(notificationNumber, email, totalUsers);
    } catch (error) {
      console.error(`Failed to send WhatsApp notification for ${email}:`, error);
    }
    
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

    const [updatedUser] = await withRetry(async () => {
      return await db!
        .update(users)
        .set({
          newsletterDialogShown,
          newsletterSubscribed,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, clerkUserId))
        .returning()
    })

    return updatedUser
  } catch (error) {
    console.error('Error updating user newsletter status:', error)
    return null
  }
}

export async function getTotalUserCount(): Promise<number> {
  try {
    if (!db) {
      console.warn('Database not available, returning 0 for user count')
      return 0
    }

    const result = await withRetry(async () => {
      return await db!
        .select({ count: count() })
        .from(users)
    })

    return result[0]?.count || 0
  } catch (error) {
    console.error('Error getting total user count:', error)
    return 0
  }
}

export async function incrementDocumentCount(clerkUserId: string) {
  try {
    if (!db) {
      console.warn('Database not available, skipping document count increment')
      return null
    }

    const [updatedUser] = await withRetry(async () => {
      return await db!
        .update(users)
        .set({
          documentCount: sql`${users.documentCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, clerkUserId))
        .returning()
    })

    return updatedUser
  } catch (error) {
    console.error('Error incrementing document count:', error)
    return null
  }
}

export async function markPowerUserFeedbackShown(clerkUserId: string) {
  try {
    if (!db) {
      console.warn('Database not available, skipping power user feedback update')
      return null
    }

    const [updatedUser] = await withRetry(async () => {
      return await db!
        .update(users)
        .set({
          powerUserFeedbackShown: true,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, clerkUserId))
        .returning()
    })

    return updatedUser
  } catch (error) {
    console.error('Error marking power user feedback as shown:', error)
    return null
  }
}

export async function resetAllNewsletterDialogStatus() {
  try {
    if (!db) {
      console.warn('Database not available, skipping newsletter dialog reset')
      return null
    }

    await withRetry(async () => {
      return await db!
        .update(users)
        .set({
          newsletterDialogShown: false,
          updatedAt: new Date(),
        })
        .where(eq(users.newsletterDialogShown, true))
    })

    return true
  } catch (error) {
    console.error('Error resetting newsletter dialog status:', error)
    return null
  }
}
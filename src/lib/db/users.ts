import { db, withRetry } from './connection'
import { users } from './schema'
import { eq, count } from 'drizzle-orm'
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
      console.log(`User ${clerkUserId} found in database`)
      console.log(`Newsletter status - Dialog shown: ${existingUser[0].newsletterDialogShown}, Subscribed: ${existingUser[0].newsletterSubscribed}`)
      return existingUser[0]
    }

    // Create new user if doesn't exist (this handles previously logged in users)
    console.log(`Creating new user ${clerkUserId} in database`)
    const [newUser] = await withRetry(async () => {
      return await db!
        .insert(users)
        .values({
          clerkUserId,
          email,
        })
        .returning()
    })

    console.log(`User ${clerkUserId} created successfully`)
    console.log(`New user newsletter status - Dialog shown: ${newUser.newsletterDialogShown}, Subscribed: ${newUser.newsletterSubscribed}`)
    
    // Send WhatsApp notification for new user registration
    const notificationNumber = process.env.WHATSAPP_NOTIFICATION_NUMBER || "19298995822";
    try {
      const totalUsers = await getTotalUserCount();
      await sendWhatsAppNotification(notificationNumber, email, totalUsers);
      console.log(`WhatsApp notification sent for new user: ${email} (Total users: ${totalUsers})`);
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

    console.log(`User ${clerkUserId} newsletter status updated successfully`)
    console.log(`Updated newsletter status - Dialog shown: ${updatedUser.newsletterDialogShown}, Subscribed: ${updatedUser.newsletterSubscribed}`)
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

    console.log('All users newsletter dialog status reset successfully')
    return true
  } catch (error) {
    console.error('Error resetting newsletter dialog status:', error)
    return null
  }
}
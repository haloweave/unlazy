import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { ensureUserExists, updateUserNewsletterStatus } from '@/lib/db/users'

export async function GET() {
  try {
    const user = await currentUser()

    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const clerkUserId = user.id
    const email = user.emailAddresses[0].emailAddress

    const userDb = await ensureUserExists(clerkUserId, email)

    if (!userDb) {
      return new NextResponse('User not found in DB', { status: 404 })
    }

    return NextResponse.json(userDb)
  } catch (error) {
    console.error('[USER_DATA_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await currentUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { newsletterDialogShown, newsletterSubscribed } = await req.json()

    if (typeof newsletterDialogShown !== 'boolean' || typeof newsletterSubscribed !== 'boolean') {
      return new NextResponse('Invalid data', { status: 400 })
    }

    const updatedUser = await updateUserNewsletterStatus(
      user.id,
      newsletterDialogShown,
      newsletterSubscribed
    )

    if (!updatedUser) {
      return new NextResponse('Failed to update user', { status: 500 })
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('[USER_DATA_PUT]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { documents } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { ensureUserExists, incrementDocumentCount } from '@/lib/db/users'

export async function GET() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      console.log('GET /api/documents - Unauthorized: userId=', userId, 'user=', !!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('GET /api/documents - userId:', userId, 'email:', user.emailAddresses[0]?.emailAddress)

    // Check if database is available
    if (!db) {
      console.error('GET /api/documents - db is NULL, DATABASE_URL missing or connection failed')
      return NextResponse.json({ documents: [] })
    }

    console.log('GET /api/documents - db is available')

    try {
      // Ensure user exists in database (handles previously logged in users)
      const userExists = await ensureUserExists(userId, user.emailAddresses[0]?.emailAddress || '')

      if (!userExists) {
        console.error('GET /api/documents - ensureUserExists returned null for userId:', userId)
        return NextResponse.json({ documents: [] })
      }

      console.log('GET /api/documents - user exists, querying documents...')

      const userDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(desc(documents.updatedAt))

      console.log('GET /api/documents - found', userDocuments.length, 'documents for userId:', userId)

      return NextResponse.json({ documents: userDocuments })
    } catch (dbError) {
      console.error('GET /api/documents - DB query failed:', dbError)
      return NextResponse.json({ documents: [] })
    }
  } catch (error) {
    console.error('GET /api/documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, id } = body

    if (!title || content === undefined) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    console.log('POST /api/documents - userId:', userId, 'docId:', id || 'NEW', 'title:', title)

    // Check if database is available
    if (!db) {
      console.error('POST /api/documents - db is NULL, returning mock document (NOT SAVED)')
      const document = {
        id: id || Date.now().toString(),
        title,
        content,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      return NextResponse.json({ document })
    }

    try {
      // Ensure user exists in database (handles previously logged in users)
      const userExists = await ensureUserExists(userId, user.emailAddresses[0]?.emailAddress || '')

      if (!userExists) {
        console.error('POST /api/documents - ensureUserExists returned null, returning mock document (NOT SAVED)')
        const document = {
          id: id || Date.now().toString(),
          title,
          content,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        return NextResponse.json({ document })
      }

      if (id) {
        // Update existing document
        const [updatedDocument] = await db
          .update(documents)
          .set({
            title,
            content,
            updatedAt: new Date()
          })
          .where(eq(documents.id, id))
          .returning()

        if (!updatedDocument) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        return NextResponse.json({ document: updatedDocument })
      } else {
        // Create new document
        const [newDocument] = await db
          .insert(documents)
          .values({
            userId,
            title,
            content
          })
          .returning()

        // Increment document count for the user
        const updatedUser = await incrementDocumentCount(userId);
        
        // Return document with user info for power user feedback check
        return NextResponse.json({ 
          document: newDocument,
          documentCount: updatedUser?.documentCount || 0,
          powerUserFeedbackShown: updatedUser?.powerUserFeedbackShown || false
        })
      }
    } catch (dbError) {
      console.error('POST /api/documents - DB operation FAILED, returning mock (NOT SAVED):', dbError)
      const document = {
        id: id || Date.now().toString(),
        title,
        content,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      return NextResponse.json({ document })
    }
  } catch (error) {
    console.error('POST /api/documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Check if database is available
    if (!db) {
      console.log('Database not available, returning mock success')
      return NextResponse.json({ success: true })
    }

    try {
      // Ensure user exists in database (handles previously logged in users)
      const userExists = await ensureUserExists(userId, user.emailAddresses[0]?.emailAddress || '')
      
      if (!userExists) {
        console.warn('Could not ensure user exists, returning mock success for delete')
        return NextResponse.json({ success: true })
      }

      const deletedDocuments = await db
        .delete(documents)
        .where(eq(documents.id, id))
        .returning()

      if (deletedDocuments.length === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    } catch (dbError) {
      console.error('Database delete failed, returning mock success:', dbError)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('DELETE /api/documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return new NextResponse('Email is required', { status: 400 })
    }

    const beehiivApiKey = process.env.BEEHIIV_API_KEY
    const beehiivPublicationId = process.env.BEEHIIV_PUBLICATION_ID

    if (!beehiivApiKey || !beehiivPublicationId) {
      return new NextResponse('Beehiiv API key or Publication ID not configured', { status: 500 })
    }

    const response = await fetch(`https://api.beehiiv.com/v2/publications/${beehiivPublicationId}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${beehiivApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        reactivate_existing: false,
        send_welcome_email: false,
        utm_source: 'unlazy-ai',
        utm_medium: 'organic',
        utm_campaign: 'initial_signup_dialog',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Beehiiv API error:', errorData)
      return new NextResponse(`Failed to subscribe: ${errorData.message || response.statusText}`, { status: response.status })
    }

    return new NextResponse('Successfully subscribed', { status: 200 })
  } catch (error) {
    console.error('[NEWSLETTER_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
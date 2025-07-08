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

    const requestBody = {
      email,
      reactivate_existing: false,
      send_welcome_email: false,
      utm_source: 'unlazy-ai',
      utm_medium: 'organic',
      utm_campaign: 'initial_signup_dialog',
    }

    const url = `https://api.beehiiv.com/v2/publications/${beehiivPublicationId}/subscriptions`
    
    // Log the equivalent curl command
    console.log('\n=== BEEHIIV API CALL ===')
    console.log(`curl -X POST "${url}" \\`)
    console.log(`  -H "Authorization: Bearer ${beehiivApiKey.substring(0, 10)}..." \\`)
    console.log(`  -H "Content-Type: application/json" \\`)
    console.log(`  -d '${JSON.stringify(requestBody, null, 2)}'`)
    console.log('=======================\n')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${beehiivApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log(`Beehiiv API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Beehiiv API error response:', errorData)
      return new NextResponse(`Failed to subscribe: ${errorData.message || response.statusText}`, { status: response.status })
    }

    const successData = await response.json()
    console.log('Beehiiv API success response:', successData)
    
    return new NextResponse('Successfully subscribed', { status: 200 })
  } catch (error) {
    console.error('[NEWSLETTER_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { sendCustomWhatsAppMessage } from '@/lib/whatsapp';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const body = await req.json();
    const { feedback } = body;

    if (!feedback || !feedback.trim()) {
      return NextResponse.json(
        { error: 'Feedback message is required' },
        { status: 400 }
      );
    }

    const notificationNumber = process.env.WHATSAPP_NOTIFICATION_NUMBER || "19298995822";
    
    // Format feedback message with timestamp and user info
    const timestamp = new Date().toLocaleString();
    
    let userInfo = 'Anonymous user';
    if (user) {
      const email = user.emailAddresses?.[0]?.emailAddress || 'No email';
      userInfo = `User ID: ${user.id}\nEmail: ${email}`;
    }
    
    const message = `📝 New Feedback from Unlazy Writer!\n\n${feedback}\n\n${userInfo}\nTime: ${timestamp}`;

    // Send WhatsApp notification
    const success = await sendCustomWhatsAppMessage(notificationNumber, message);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to send feedback notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
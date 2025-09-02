import { NextRequest, NextResponse } from 'next/server';
import { sendCustomWhatsAppMessage } from '@/lib/whatsapp';
import { currentUser } from '@clerk/nextjs/server';
import { markPowerUserFeedbackShown } from '@/lib/db/users';

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

    if (!user) {
      return NextResponse.json(
        { error: 'User must be authenticated' },
        { status: 401 }
      );
    }

    const notificationNumber = process.env.WHATSAPP_NOTIFICATION_NUMBER || "19298995822";
    
    // Format feedback message with timestamp and user info
    const timestamp = new Date().toLocaleString();
    const email = user.emailAddresses?.[0]?.emailAddress || 'No email';
    
    const message = `🌟 Power User Feedback from Unlazy Writer!\n\n"${feedback}"\n\nUser ID: ${user.id}\nEmail: ${email}\nTime: ${timestamp}\n\n💡 This user has created 3+ documents!`;

    // Send WhatsApp notification
    const success = await sendCustomWhatsAppMessage(notificationNumber, message);

    if (success) {
      // Mark the feedback as shown so it doesn't appear again
      await markPowerUserFeedbackShown(user.id);
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to send feedback notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Power user feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
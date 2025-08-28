interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiUrl: string;
}

interface WhatsAppTemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

const whatsappConfig: WhatsAppConfig = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "772395815954550",
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "EAALXuMIE5sQBPbBlVFig6bR5ZCfPffXrZBnMNtlHwcC90MMdIQZBQP87oVNaEJ3vG0oBURShhqwfu29NIdZCt2m2NNZASLDNVaIbN4nUx0iwFQueUgeZCEveAWFNOjDZAGLFXYfgZCJHMtT9mQ7zliX85z7YVu1UYwhzB0R7PE6wPetwqd2Ir8viejihwZB7MSwZDZD",
  apiUrl: `https://graph.facebook.com/v22.0`
};

export async function sendWhatsAppNotification(
  recipientNumber: string,
  userEmail: string
): Promise<boolean> {
  try {
    const message: WhatsAppTemplateMessage = {
      messaging_product: "whatsapp",
      to: recipientNumber,
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US"
        }
      }
    };

    const response = await fetch(
      `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('WhatsApp API Error:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('WhatsApp message sent successfully:', result);
    console.log(`New user registration notification sent for: ${userEmail}`);
    
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    return false;
  }
}

export async function sendCustomWhatsAppMessage(
  recipientNumber: string,
  message: string
): Promise<boolean> {
  try {
    const messagePayload = {
      messaging_product: "whatsapp",
      to: recipientNumber,
      type: "text",
      text: {
        body: message
      }
    };

    const response = await fetch(
      `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('WhatsApp API Error:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('WhatsApp message sent successfully:', result);
    
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
}
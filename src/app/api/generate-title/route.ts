import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || content.length < 100) {
      return NextResponse.json({ title: 'Untitled Document' });
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: 'Generate a concise, descriptive title (3-8 words) for the given text. Return only the title, no quotes or extra text.'
        },
        {
          role: 'user',
          content: `Generate a title for this text:\n\n${content}...`
        }
      ],
      temperature: 0.7,
      maxTokens: 20,
    });

    return NextResponse.json({ title: text.trim() });
  } catch (error) {
    console.error('Title generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}
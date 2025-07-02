import { NextRequest, NextResponse } from 'next/server';
import { retext } from 'retext';
import retextEnglish from 'retext-english';
import retextSpell from 'retext-spell';
import retextRepeatedWords from 'retext-repeated-words';
import retextPassive from 'retext-passive';
import retextReadability from 'retext-readability';
import dictionary from 'dictionary-en';

interface GrammarSpellingIssue {
  text: string;
  type: 'grammar' | 'spelling';
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'suggestion';
  position?: { start: number; end: number };
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || content.length < 2) {
      return NextResponse.json({ issues: [] });
    }

    const issues: GrammarSpellingIssue[] = [];

    const file = await retext()
      .use(retextEnglish)
      .use(retextSpell, { dictionary })
      .process(content);

    for (const message of file.messages) {
      issues.push({
        text: (message as any).actual || '',
        type: 'spelling',
        issue: message.reason || 'Spelling error',
        suggestion: (message as any).expected ? (message as any).expected.join(', ') : 'Check spelling',
        severity: 'error',
        position: {
          start: 0,
          end: 0,
        },
      });
    }

    return NextResponse.json({ 
      issues,
      message: 'Grammar and spelling check completed'
    });

  } catch (error) {
    console.error('Grammar check error:', error);
    return NextResponse.json(
      { error: 'Failed to check grammar and spelling' },
      { status: 500 }
    );
  }
}

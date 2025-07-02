import { NextRequest, NextResponse } from 'next/server';
import { retext } from 'retext';
import retextEnglish from 'retext-english';
import retextSpell from 'retext-spell';
import retextRepeatedWords from 'retext-repeated-words';
import retextPassive from 'retext-passive';
import retextReadability from 'retext-readability';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface GrammarSpellingIssue {
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

    // Convert HTML to plain text for grammar checking
    const plainText = content
      .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
      .replace(/&nbsp;/g, ' ')   // Replace &nbsp; with spaces
      .replace(/&amp;/g, '&')    // Replace &amp; with &
      .replace(/&lt;/g, '<')     // Replace &lt; with <
      .replace(/&gt;/g, '>')     // Replace &gt; with >
      .replace(/&quot;/g, '"')   // Replace &quot; with "
      .replace(/&#39;/g, "'")    // Replace &#39; with '
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .trim();

    if (!plainText || plainText.length < 2) {
      return NextResponse.json({ issues: [] });
    }

    const issues: GrammarSpellingIssue[] = [];

    // LLM will handle proper names contextually instead of hardcoded filtering

    // Helper function to get best contextual suggestion
    const getBestSuggestion = (word: string, suggestions: string[], context: string): string => {
      if (!suggestions || suggestions.length === 0) return 'Check spelling';
      
      // For very close matches (1-2 character difference), return the first suggestion
      if (suggestions.length > 0) {
        const firstSuggestion = suggestions[0];
        const editDistance = Math.abs(word.length - firstSuggestion.length);
        if (editDistance <= 2) {
          return firstSuggestion;
        }
      }
      
      // Return top 3 suggestions for longer lists
      return suggestions.slice(0, 3).join(', ');
    };

    // Create processor with spell checking (with fallback)
    let processor;
    try {
      const en = await import('dictionary-en').then(m => m.default);
      processor = retext()
        .use(retextEnglish)
        .use(retextSpell, en)
        .use(retextRepeatedWords)
        .use(retextPassive)
        .use(retextReadability, { age: 16 });
    } catch (error) {
      console.warn('Could not load spell checker dictionary, falling back to grammar-only checking');
      processor = retext()
        .use(retextEnglish)
        .use(retextRepeatedWords)
        .use(retextPassive)
        .use(retextReadability, { age: 16 });
    }

    const file = await processor.process(plainText);

    for (const message of file.messages) {
      // Skip all grammar-related issues, only process spelling
      if (message.source === 'retext-repeated-words' || 
          message.source === 'retext-passive' || 
          message.source === 'retext-readability') {
        continue;
      }

      // Only process spelling issues
      // eslint-disable-next-line prefer-const
      let type: 'grammar' | 'spelling' = 'spelling';
      // eslint-disable-next-line prefer-const
      let severity: 'error' | 'warning' | 'suggestion' = 'error';

      // Extract text from the message
      const messageAny = message as {
        actual?: string;
        note?: string;
        expected?: string[];
        position?: {
          start?: { offset?: number };
          end?: { offset?: number };
        };
      };
      let text = '';
      let suggestion = '';
      const position = { start: 0, end: 0 };

      if (messageAny.actual) {
        text = messageAny.actual;
      } else if (messageAny.note) {
        text = messageAny.note;
      } else {
        // Try to extract from reason
        const reasonMatch = message.reason?.match(/`([^`]+)`/);
        text = reasonMatch ? reasonMatch[1] : '';
      }

      // Let LLM handle proper names contextually instead of filtering here

      // Calculate position in the text
      if (text && messageAny.position) {
        const pos = messageAny.position;
        if (pos.start && pos.start.offset !== undefined) {
          position.start = pos.start.offset;
        }
        if (pos.end && pos.end.offset !== undefined) {
          position.end = pos.end.offset;
        }
      } else if (text) {
        // Fallback: find position in plainText
        const textIndex = plainText.indexOf(text);
        if (textIndex !== -1) {
          position.start = textIndex;
          position.end = textIndex + text.length;
        }
      }

      if (messageAny.expected && Array.isArray(messageAny.expected)) {
        suggestion = getBestSuggestion(text, messageAny.expected, plainText);
      } else if (message.source === 'retext-repeated-words') {
        suggestion = 'Remove repeated word';
      } else if (message.source === 'retext-passive') {
        suggestion = 'Consider using active voice';
      } else if (message.source === 'retext-readability') {
        suggestion = 'Consider simplifying this sentence';
      } else {
        suggestion = 'Check spelling';
      }

      // Skip issues without meaningful text
      if (!text || text.length < 2) continue;

      issues.push({
        text: text,
        type,
        issue: message.reason || 'Issue detected',
        suggestion,
        severity,
        position,
      });
    }

    // Smart LLM-based filtering to remove false positives
    let finalIssues = issues;
    if (issues.length > 0 && issues.length <= 10) { // Only for reasonable number of issues
      try {
        const { object } = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: z.object({
            validIndices: z.array(z.number()).describe('Array of 0-based indices representing actual spelling errors that need correction')
          }),
          messages: [
            {
              role: 'system',
              content: `You are a contextual spelling checker filter. Given a text and potential spelling issues, determine which are actual spelling errors that need correction.

Consider the FULL CONTEXT of the document. Do NOT flag words that are:
- Proper names (people, places, organizations) appropriate to the context
- Scientific/technical terms relevant to the subject matter
- Domain-specific terminology (medical, legal, academic, etc.)
- Valid alternative spellings or regional variants
- Brand names, product names, or specialized vocabulary
- Words that are correct within the context of the passage

Only flag words that are clearly misspelled regardless of context.

Return only indices (0-based) that represent ACTUAL spelling errors that need correction.`
            },
            {
              role: 'user',
              content: `Text: "${plainText}"

Potential issues:
${issues.map((issue, i) => `${i}: "${issue.text}" (suggested: ${issue.suggestion})`).join('\n')}

Return indices for actual spelling errors only.`
            }
          ],
          temperature: 0,
        });

        if (Array.isArray(object.validIndices)) {
          finalIssues = issues.filter((_, index) => object.validIndices.includes(index));
        }
      } catch (error) {
        console.warn('LLM filtering failed, using original results:', error);
        // Fall back to original issues if filtering fails
      }
    }

    return NextResponse.json({ 
      issues: finalIssues,
      message: 'Spelling check completed'
    });

  } catch (error) {
    console.error('Grammar check error:', error);
    return NextResponse.json(
      { error: 'Failed to check grammar and spelling' },
      { status: 500 }
    );
  }
}

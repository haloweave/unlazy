import { NextRequest, NextResponse } from 'next/server';
import { retext } from 'retext';
import retextEnglish from 'retext-english';
import retextSpell from 'retext-spell';
import retextRepeatedWords from 'retext-repeated-words';
import retextPassive from 'retext-passive';
import retextReadability from 'retext-readability';

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

    // Helper function to check if a word is likely a proper name
    const isProperName = (word: string): boolean => {
      // Check if word starts with capital letter and is not at sentence start
      if (!/^[A-Z][a-z]+$/.test(word)) return false;
      
      // Common proper names to skip
      const commonNames = [
        'Elara', 'Clara', 'Lara', 'Sarah', 'Emma', 'John', 'James', 'Michael', 'David',
        'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
        'Jessica', 'Ashley', 'Kimberly', 'Amy', 'Melissa', 'Donna', 'Ruth', 'Carol'
      ];
      
      return commonNames.some(name => word.toLowerCase() === name.toLowerCase());
    };

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

    // Process with multiple retext plugins (excluding spell check for now due to build issues)
    const processor = retext()
      .use(retextEnglish)
      .use(retextRepeatedWords)
      .use(retextPassive)
      .use(retextReadability, { age: 16 }); // Target reading level

    const file = await processor.process(plainText);

    for (const message of file.messages) {
      // Determine issue type based on the plugin that generated it
      let type: 'grammar' | 'spelling' = 'spelling';
      let severity: 'error' | 'warning' | 'suggestion' = 'error';
      
      if (message.source === 'retext-repeated-words') {
        type = 'grammar';
        severity = 'warning';
      } else if (message.source === 'retext-passive') {
        type = 'grammar';
        severity = 'suggestion';
      } else if (message.source === 'retext-readability') {
        type = 'grammar';
        severity = 'suggestion';
      }

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

      // Skip proper names for spelling errors
      if (type === 'spelling' && text && isProperName(text)) {
        continue;
      }

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
      } else if (type === 'grammar') {
        // Provide appropriate suggestions for grammar issues
        if (message.source === 'retext-repeated-words') {
          suggestion = 'Remove repeated word';
        } else if (message.source === 'retext-passive') {
          suggestion = 'Consider using active voice';
        } else if (message.source === 'retext-readability') {
          suggestion = 'Consider simplifying this sentence';
        } else {
          suggestion = 'Review grammar';
        }
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

import { NextRequest, NextResponse } from 'next/server';
import { retext } from 'retext';
import retextEnglish from 'retext-english';
import retextSpell from 'retext-spell';
import retextRepeatedWords from 'retext-repeated-words';
import retextPassive from 'retext-passive';
import retextReadability from 'retext-readability';

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

    // Load dictionary dynamically to avoid build issues
    let processor;
    try {
      const { default: en } = await import('dictionary-en');
      processor = retext()
        .use(retextEnglish)
        .use(retextSpell, { dictionary: en })
        .use(retextRepeatedWords)
        .use(retextPassive)
        .use(retextReadability, { age: 16 }); // Target reading level
    } catch (error) {
      console.warn('Could not load spell checker dictionary, falling back to grammar-only checking');
      processor = retext()
        .use(retextEnglish)
        .use(retextRepeatedWords)
        .use(retextPassive)
        .use(retextReadability, { age: 16 }); // Target reading level
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
        const filterResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a spelling checker filter. Given a text and potential spelling issues, determine which are actual spelling errors vs proper names, valid words, or acceptable variants.
                
Return only a JSON array of indices (0-based) that represent ACTUAL spelling errors that need correction. Do not include:
- Proper names (like "Elara", "Clara")  
- Valid hyphenated words (like "kind-hearted")
- Valid alternative spellings
- Names of places, people, brands
- Technical terms that are correctly spelled

Be very conservative - only flag clear misspellings.`
              },
              {
                role: 'user',
                content: `Text: "${plainText}"

Potential issues:
${issues.map((issue, i) => `${i}: "${issue.text}" (suggested: ${issue.suggestion})`).join('\n')}

Return JSON array of indices for actual spelling errors only:`
              }
            ],
            temperature: 0,
            max_tokens: 100
          }),
        });

        if (filterResponse.ok) {
          const filterData = await filterResponse.json();
          let content = filterData.choices[0].message.content;
          
          // Clean markdown formatting if present
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          const validIndices = JSON.parse(content);
          if (Array.isArray(validIndices)) {
            finalIssues = issues.filter((_, index) => validIndices.includes(index));
          }
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

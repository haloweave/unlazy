import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface GrammarSpellingIssue {
  text: string;
  type: 'spelling';
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'suggestion';
  position?: { start: number; end: number };
}

export async function POST(request: NextRequest) {
  try {
    const { content, recentlyFixed = [] } = await request.json();

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

    console.log('Grammar check input text:', plainText);
    console.log('Grammar check text length:', plainText.length);

    const { object: issuesObject } = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt: `
        You are a proofreader focused EXCLUSIVELY on spelling and grammar.
        
        CRITICAL: Assume ALL content is fictional/creative writing. DO NOT fact-check anything.
        
        ONLY flag these types of errors:
        1. Misspelled words (e.g., "recieve" → "receive")
        2. Grammar errors (e.g., "he don't" → "he doesn't")
        3. Punctuation mistakes (e.g., "Hello world" → "Hello, world")
        4. Verb tense errors (e.g., "I goed" → "I went")
        5. Subject-verb disagreement (e.g., "The cats is" → "The cats are")
        
        NEVER flag these (even if factually wrong):
        - Names, places, dates, historical events
        - Scientific claims or measurements
        - Any content-related information
        - Proper nouns
        
        Think of this as proofreading a fantasy novel - check the language, not the facts.
        
        Examples from your text:
        - "Emperor Napoleon" - This is a proper noun, do NOT flag
        - "5th century AD" - This is a date format, do NOT flag
        - "chocolate bricks" - This is creative content, do NOT flag
        - "Tokyo" - This is a place name, do NOT flag
        
        Only return spelling/grammar errors. If the text has perfect spelling and grammar, return empty array.

        Text to analyze:
        ---
        ${plainText}
        ---
      `,
      schema: z.object({
        issues: z.array(
          z.object({
            text: z.string(),
            issue: z.string(),
            suggestion: z.string(),
            severity: z.enum(['error', 'warning', 'suggestion']),
          })
        ),
      }),
    });

    console.log('Grammar check raw AI response:', JSON.stringify(issuesObject, null, 2));

    // Filter out any issues that mention factual inaccuracies or content-related problems
    const filteredIssues = issuesObject.issues.filter(issue => {
      const issueText = issue.issue.toLowerCase();
      const suggestionText = issue.suggestion.toLowerCase();
      
      // Check for factual/content-related keywords
      const factualKeywords = [
        'factual', 'historical', 'incorrect', 'inaccurate', 'context', 'geographical',
        'scientific', 'claim', 'unlikely', 'impossible', 'unrealistic', 'wrong information',
        'false', 'untrue', 'misleading', 'not accurate', 'historically incorrect',
        'geographically incorrect', 'scientifically incorrect', 'implausible',
        'incorrect reference', 'wrong reference', 'n/a', 'not applicable'
      ];
      
      const containsFactualKeywords = factualKeywords.some(keyword => 
        issueText.includes(keyword) || suggestionText.includes(keyword)
      );
      
      if (containsFactualKeywords) {
        console.log('Filtered out factual issue:', issue);
        return false;
      }
      
      // Filter out recently fixed issues to prevent false positives
      const isRecentlyFixed = recentlyFixed.some((fixedText: string) => {
        const normalizeText = (text: string) => text.toLowerCase().trim();
        return normalizeText(issue.text) === normalizeText(fixedText) || 
               normalizeText(issue.suggestion) === normalizeText(fixedText);
      });
      
      if (isRecentlyFixed) {
        console.log('Filtered out recently fixed issue:', issue);
        return false;
      }
      
      return true;
    });

    const issues: GrammarSpellingIssue[] = filteredIssues.map((issue) => {
      const start = plainText.indexOf(issue.text);
      const end = start + issue.text.length;
      return {
        ...issue,
        type: 'spelling',
        position: start !== -1 ? { start, end } : undefined,
      };
    });

    console.log('Grammar check final issues count:', issues.length);
    console.log('Grammar check final issues:', JSON.stringify(issues, null, 2));

    return NextResponse.json({
      issues,
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

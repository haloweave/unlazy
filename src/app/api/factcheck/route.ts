import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, mode = 'full' } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Convert HTML to plain text for fact checking
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

    if (!plainText || plainText.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    console.log('Plain text sent to AI model:', plainText);

    // Define schemas for different modes
    const realtimeSchema = z.object({
      issues: z.array(z.object({
        text: z.string().describe('Exact text from document'),
        issue: z.string().describe('Clear statement of what is factually wrong'),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence level'),
        suggestion: z.string().describe('The correct factual information')
      })).describe('Array of potential issues, empty if no issues found')
    });

    const detailedSchema = z.object({
      summary: z.string().describe('Overall assessment'),
      issues: z.array(z.object({
        text: z.string().describe('Exact problematic text'),
        category: z.enum(['factual_error', 'needs_verification', 'misleading', 'outdated']).describe('Category of issue'),
        issue: z.string().describe('Clear statement of what is factually wrong'),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence level'),
        suggestion: z.string().describe('The correct factual information'),
        importance: z.enum(['critical', 'moderate', 'minor']).describe('Importance level')
      })),
      verificationNeeded: z.array(z.string()).describe('List of claims that need source verification')
    });

    let result;
    let maxTokens = 500;

    switch (mode) {
      case 'realtime':
        maxTokens = 2000;
        const { object: realtimeResult } = await generateObject({
          model: openai('gpt-4o'),
          schema: realtimeSchema,
          messages: [
            {
              role: "system",
              content: `You are a real-time fact-checking assistant. Analyze the provided text and identify potential factual errors, questionable claims, or statements that need verification.

IMPORTANT RULES:
1. Only flag clear factual claims that are definitively wrong or verifiably incorrect
2. Don't flag opinions, subjective statements, or creative writing
3. Focus on dates, numbers, names, events, scientific claims, and historical facts
4. Provide confidence levels: HIGH (definitely wrong), MEDIUM (likely wrong/questionable), LOW (needs verification)
5. Be definitive and assertive - state what's wrong, don't just suggest verification
6. For HIGH confidence issues: State the correct fact, don't ask to verify
7. Your suggested correction MUST be the most precise and factually accurate statement possible. It must be definitive and not require further correction. For example, if correcting a height, name the specific species (e.g., 'The Emperor Penguin grows to 1.2m'). This prevents correction loops.
8. CRITICAL: Limit to maximum 15 issues for comprehensive analysis
9. Prioritize the most egregious factual errors

Examples of good responses:
- HIGH: "Birds cannot meow - they chirp, tweet, or make other bird sounds"
- HIGH: "Cats don't bark - they meow, purr, or hiss"
- MEDIUM: "Common sparrows typically live 4-7 years, not 120 years"

If no issues found, return empty issues array.`
            },
            {
              role: "user",
              content: `Please fact-check this text (limit to max 15 issues):\n\n${plainText.length > 8000 ? plainText.substring(0, 8000) + '...' : plainText}`
            }
          ],
          maxTokens,
          temperature: 0.1,
        });
        // Filter to only HIGH confidence issues
        result = realtimeResult.issues.filter(issue => issue.confidence === 'HIGH');
        break;

      case 'detailed':
        maxTokens = 4000;
        const { object: detailedResult } = await generateObject({
          model: openai('gpt-4o'),
          schema: detailedSchema,
          messages: [
            {
              role: "system",
              content: `You are a thorough fact-checking expert. Analyze the provided text comprehensively for factual accuracy.

Check for:
1. Factual errors in dates, numbers, events, and claims
2. Misleading or oversimplified statements
3. Claims that need sources or verification
4. Logical inconsistencies
5. Outdated information that may no longer be accurate

For each issue, provide detailed analysis with confidence levels and importance ratings.`
            },
            {
              role: "user",
              content: `Please fact-check this text (limit to max 25 issues):\n\n${plainText.length > 12000 ? plainText.substring(0, 12000) + '...' : plainText}`
            }
          ],
          maxTokens,
          temperature: 0.1,
        });
        // Filter to only HIGH confidence issues for detailed mode too
        result = {
          ...detailedResult,
          issues: detailedResult.issues.filter(issue => issue.confidence === 'HIGH')
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    return NextResponse.json({
      mode,
      result,
      contentLength: content.length,
      plainTextLength: plainText.length,
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('Error in fact-check API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)) // Log full error object
    }, { status: 500 });
  }
}
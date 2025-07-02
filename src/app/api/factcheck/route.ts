import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

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

    // Define schemas for different modes
    const realtimeSchema = z.object({
      issues: z.array(z.object({
        text: z.string().describe('Exact text from document'),
        issue: z.string().describe('Brief description of the potential error'),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence level'),
        suggestion: z.string().describe('Brief correction or verification needed')
      })).describe('Array of potential issues, empty if no issues found')
    });

    const detailedSchema = z.object({
      summary: z.string().describe('Overall assessment'),
      issues: z.array(z.object({
        text: z.string().describe('Exact problematic text'),
        category: z.enum(['factual_error', 'needs_verification', 'misleading', 'outdated']).describe('Category of issue'),
        issue: z.string().describe('Detailed explanation'),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence level'),
        suggestion: z.string().describe('How to fix or verify'),
        importance: z.enum(['critical', 'moderate', 'minor']).describe('Importance level')
      })),
      verificationNeeded: z.array(z.string()).describe('List of claims that need source verification')
    });

    let result;
    let maxTokens = 500;

    switch (mode) {
      case 'realtime':
        maxTokens = 500;
        const { object: realtimeResult } = await generateObject({
          model: openai('gpt-4o'),
          schema: realtimeSchema,
          messages: [
            {
              role: "system",
              content: `You are a real-time fact-checking assistant. Analyze the provided text and identify potential factual errors, questionable claims, or statements that need verification.

IMPORTANT RULES:
1. Only flag clear factual claims that can be verified or disproven
2. Don't flag opinions, subjective statements, or creative writing
3. Focus on dates, numbers, names, events, scientific claims, and historical facts
4. Provide confidence levels: HIGH (definitely wrong), MEDIUM (likely wrong/questionable), LOW (needs verification)
5. Be concise - this is real-time analysis

If no issues found, return empty issues array.`
            },
            {
              role: "user",
              content: `Please fact-check this text:\n\n${plainText}`
            }
          ],
          maxTokens,
          temperature: 0.1,
        });
        result = realtimeResult.issues;
        break;

      case 'detailed':
        maxTokens = 1000;
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
              content: `Please fact-check this text:\n\n${plainText}`
            }
          ],
          maxTokens,
          temperature: 0.1,
        });
        result = detailedResult;
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
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
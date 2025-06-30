import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Different prompts based on fact-checking mode
    let systemPrompt = '';
    let maxTokens = 500;

    switch (mode) {
      case 'realtime':
        systemPrompt = `You are a real-time fact-checking assistant. Analyze the provided text and identify potential factual errors, questionable claims, or statements that need verification.

IMPORTANT RULES:
1. Only flag clear factual claims that can be verified or disproven
2. Don't flag opinions, subjective statements, or creative writing
3. Focus on dates, numbers, names, events, scientific claims, and historical facts
4. Provide confidence levels: HIGH (definitely wrong), MEDIUM (likely wrong/questionable), LOW (needs verification)
5. Be concise - this is real-time analysis

Return a JSON array of potential issues:
[
  {
    "text": "exact text from document",
    "issue": "brief description of the potential error",
    "confidence": "HIGH|MEDIUM|LOW",
    "suggestion": "brief correction or verification needed"
  }
]

If no issues found, return empty array: []`;
        maxTokens = 300;
        break;

      case 'detailed':
        systemPrompt = `You are a thorough fact-checking expert. Analyze the provided text comprehensively for factual accuracy.

Check for:
1. Factual errors in dates, numbers, events, and claims
2. Misleading or oversimplified statements
3. Claims that need sources or verification
4. Logical inconsistencies
5. Outdated information that may no longer be accurate

For each issue, provide:
- The problematic text
- Why it's potentially wrong or needs verification
- Suggested corrections or what to verify
- Confidence level in your assessment

Return detailed JSON analysis:
{
  "summary": "overall assessment",
  "issues": [
    {
      "text": "exact problematic text",
      "category": "factual_error|needs_verification|misleading|outdated",
      "issue": "detailed explanation",
      "confidence": "HIGH|MEDIUM|LOW",
      "suggestion": "how to fix or verify",
      "importance": "critical|moderate|minor"
    }
  ],
  "verificationNeeded": ["list of claims that need source verification"]
}`;
        maxTokens = 800;
        break;

      default:
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Please fact-check this text:\n\n${content}`
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.1, // Low temperature for factual accuracy
    });

    const result = completion.choices[0]?.message?.content;
    
    if (!result) {
      return NextResponse.json({ error: 'No fact-check result' }, { status: 500 });
    }

    try {
      // Try to parse as JSON
      const parsedResult = JSON.parse(result);
      return NextResponse.json({
        mode,
        result: parsedResult,
        contentLength: content.length,
        processingTime: Date.now()
      });
    } catch (parseError) {
      // If JSON parsing fails, return as text with empty issues array
      return NextResponse.json({
        mode,
        result: mode === 'realtime' ? [] : { summary: result, issues: [] },
        contentLength: content.length,
        processingTime: Date.now(),
        warning: 'Response was not in expected JSON format'
      });
    }

  } catch (error) {
    console.error('Error in fact-check API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
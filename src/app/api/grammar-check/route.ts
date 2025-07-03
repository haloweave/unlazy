import { NextRequest, NextResponse } from 'next/server';
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

    const { object: issuesObject } = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt: `
        You are an expert in English grammar and spelling.
        Analyze the following text and identify any grammar or spelling errors.
        For each error, provide the incorrect text, the type of error (grammar or spelling), a brief description of the issue, a suggested correction, and the severity of the error.
        The severity should be 'error' for clear mistakes, 'warning' for potential issues, and 'suggestion' for stylistic improvements.
        Return the issues as a JSON object with a single key "issues" that contains an array of issue objects.
        If there are no issues, return an empty array.

        Text to analyze:
        ---
        ${plainText}
        ---
      `,
      schema: z.object({
        issues: z.array(
          z.object({
            text: z.string(),
            type: z.enum(['grammar', 'spelling']),
            issue: z.string(),
            suggestion: z.string(),
            severity: z.enum(['error', 'warning', 'suggestion']),
          })
        ),
      }),
    });

    const issues: GrammarSpellingIssue[] = issuesObject.issues.map((issue) => {
      const start = plainText.indexOf(issue.text);
      const end = start + issue.text.length;
      return {
        ...issue,
        position: start !== -1 ? { start, end } : undefined,
      };
    });

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

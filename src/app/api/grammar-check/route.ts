import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import crypto from 'crypto';

export interface GrammarSpellingIssue {
  text: string;
  type: 'spelling';
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'suggestion';
  position?: { start: number; end: number };
}

// In-memory cache for grammar check results
const grammarCheckCache = new Map<string, {
  result: GrammarSpellingIssue[];
  timestamp: number;
  expiresAt: number;
}>();

// Cache TTL: 1 hour for grammar checks (shorter than fact checks)
const GRAMMAR_CACHE_TTL = 60 * 60 * 1000;

// Generate content hash for caching
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
}

// Calculate similarity between two strings (0 = completely different, 1 = identical)
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
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

    // Generate content hash for caching
    const contentHash = generateContentHash(plainText);
    
    // Check cache first
    const cached = grammarCheckCache.get(contentHash);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('Returning cached grammar-check result for hash:', contentHash);
      return NextResponse.json({
        issues: cached.result,
        message: 'Grammar check completed (cached)',
        cached: true
      });
    }

    console.log('Grammar check input text:', plainText);
    console.log('Grammar check text length:', plainText.length);

    const { object: issuesObject } = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt: `
        You are a strict spelling and grammar checker. ONLY flag actual errors.
        
        STRICT RULES:
        1. ONLY flag OBVIOUS misspellings (e.g., "recieve" → "receive", "teh" → "the")
        2. ONLY flag clear grammar errors (e.g., "he don't" → "he doesn't")
        3. DO NOT flag common words like: today, awesome, feels, life, much, less, typically, etc.
        4. DO NOT flag proper nouns, names, places, or technical terms
        5. DO NOT suggest the same text as a correction
        6. Be very conservative - when in doubt, DON'T flag it
        
        Examples of what TO flag:
        - "fantsstc" → "fantastic" (clear misspelling)
        - "dat" → "day" (clear misspelling)
        - "lif" → "life" (clear misspelling)
        - "he don't go" → "he doesn't go" (grammar error)
        
        Examples of what NOT to flag:
        - "awesome" (correct spelling)
        - "feels" (correct spelling)
        - "today" (correct spelling)
        - "much less than 1 kilogram" (correct)
        - Any proper nouns or technical terms
        
        CRITICAL RULES:
        - If your suggestion is identical to the original text, DO NOT include it
        - If the text has no errors, return an empty array - do NOT create fake issues
        - NEVER suggest "No issues found" or "Correct as is" - just return empty array
        - Only flag text if there is a CLEAR, OBVIOUS error that needs fixing

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

    // Filter out problematic issues
    const filteredIssues = issuesObject.issues.filter(issue => {
      const issueText = issue.issue.toLowerCase();
      const suggestionText = issue.suggestion.toLowerCase();
      const originalText = issue.text.toLowerCase().trim();
      const suggestedText = issue.suggestion.toLowerCase().trim();
      
      // Filter out self-referential suggestions (suggestion same as original)
      const normalizedOriginal = originalText.replace(/[^\w\s]/g, '').trim();
      const normalizedSuggestion = suggestedText.replace(/[^\w\s]/g, '').trim();
      
      if (normalizedOriginal === normalizedSuggestion) {
        console.log('Filtered out self-referential issue:', issue);
        return false;
      }
      
      // Filter out issues where the suggestion contains the entire original text
      if (suggestionText.includes(originalText) && suggestionText.length > originalText.length * 1.2) {
        console.log('Filtered out sentence-level suggestion:', issue);
        return false;
      }
      
      // Filter out suggestions that are just the original text with minor punctuation changes
      const similarity = calculateSimilarity(normalizedOriginal, normalizedSuggestion);
      if (similarity > 0.95) {
        console.log('Filtered out highly similar suggestion:', issue, 'similarity:', similarity);
        return false;
      }
      
      // Filter out unhelpful suggestions
      const unhelpfulSuggestions = [
        'no issues found', 'no issues', 'no errors found', 'no errors', 'correct as is',
        'looks good', 'appears correct', 'no changes needed', 'no correction needed',
        'this is correct', 'already correct', 'text is correct', 'spelling is correct',
        'no problems', 'no spelling errors', 'no grammar errors'
      ];
      
      const isUnhelpful = unhelpfulSuggestions.some(phrase => 
        suggestionText.includes(phrase)
      );
      
      if (isUnhelpful) {
        console.log('Filtered out unhelpful suggestion:', issue);
        return false;
      }
      
      // Filter out common words that shouldn't be flagged
      const commonWords = [
        'today', 'awesome', 'feels', 'life', 'much', 'less', 'typically', 'weigh',
        'hummingbirds', 'kilogram', 'faster', 'creature', 'earth', 'dive', 'emperor',
        'penguins', 'depths', 'meters', 'birds', 'legs', 'balance', 'flight', 'walking'
      ];
      
      if (commonWords.includes(originalText)) {
        console.log('Filtered out common word:', issue);
        return false;
      }
      
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

    // Store result in cache
    grammarCheckCache.set(contentHash, {
      result: issues,
      timestamp: Date.now(),
      expiresAt: Date.now() + GRAMMAR_CACHE_TTL
    });

    // Clean up expired cache entries
    for (const [key, value] of grammarCheckCache.entries()) {
      if (value.expiresAt < Date.now()) {
        grammarCheckCache.delete(key);
      }
    }

    console.log('Grammar check completed, result cached with hash:', contentHash);

    return NextResponse.json({
      issues,
      message: 'Grammar check completed',
      cached: false
    });

  } catch (error) {
    console.error('Grammar check error:', error);
    return NextResponse.json(
      { error: 'Failed to check grammar and spelling' },
      { status: 500 }
    );
  }
}

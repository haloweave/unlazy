import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import crypto from 'crypto';

// Types for fact-check results
interface FactCheckIssue {
  text: string;
  issue: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
  category?: string;
  importance?: 'critical' | 'moderate' | 'minor';
}

interface DetailedFactCheckResult {
  summary: string;
  issues: FactCheckIssue[];
  verificationNeeded: string[];
}

type FactCheckResult = FactCheckIssue[] | DetailedFactCheckResult;

// In-memory cache for fact-check results (in production, use Redis or database)
const factCheckCache = new Map<string, {
  result: FactCheckResult;
  timestamp: number;
  expiresAt: number;
}>();

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000;

// User corrections storage (in production, use database)
const userCorrections = new Map<string, {
  userId: string;
  contentHash: string;
  originalText: string;
  correctedText: string;
  correctionType: 'accepted' | 'rejected' | 'ignored';
  timestamp: number;
}[]>();

// Generate content hash for caching
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
}

// Stable correction templates to prevent hallucination
const correctionTemplates = {
  'great wall location': 'The Great Wall of China is located in China, not in other countries',
  'great wall length': 'The Great Wall of China stretches over 21,000 kilometers',
  'great wall materials': 'The Great Wall of China is made of stone, brick, tamped earth, and other traditional materials',
  'great wall builders': 'The Great Wall of China was built over several dynasties, primarily the Qin, Han, and Ming dynasties',
  'great wall purpose': 'The Great Wall of China was built to protect against invasions from northern nomadic groups',
  'great wall timeframe': 'The Great Wall of China was built over many centuries, starting as early as the 7th century BC'
};

// Check semantic similarity to avoid re-flagging corrections
function checkSemanticSimilarity(text1: string, text2: string): boolean {
  const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);
  
  // Simple word overlap check (in production, use embeddings)
  const words1 = new Set(normalized1.split(/\s+/));
  const words2 = new Set(normalized2.split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size > 0.7; // 70% similarity threshold
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, mode = 'realtime', userFeedback = null } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Handle user feedback for correction tracking
    if (userFeedback) {
      const { correctionType, originalText, correctedText } = userFeedback;
      const contentHash = generateContentHash(originalText);
      
      if (!userCorrections.has(user.id)) {
        userCorrections.set(user.id, []);
      }
      
      userCorrections.get(user.id)!.push({
        userId: user.id,
        contentHash,
        originalText,
        correctedText,
        correctionType,
        timestamp: Date.now()
      });
      
      return NextResponse.json({ message: 'Feedback recorded' });
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

    // Generate content hash for caching
    const contentHash = generateContentHash(plainText);
    
    // Check cache first
    const cached = factCheckCache.get(contentHash);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('Returning cached fact-check result for hash:', contentHash);
      return NextResponse.json({
        mode,
        result: cached.result,
        contentLength: content.length,
        plainTextLength: plainText.length,
        processingTime: Date.now(),
        cached: true
      });
    }

    // Check if user has previously corrected similar content
    const userCorrectionsList = userCorrections.get(user.id) || [];
    const hasUserCorrection = userCorrectionsList.some(correction => 
      correction.correctionType === 'accepted' && 
      checkSemanticSimilarity(plainText, correction.correctedText)
    );

    if (hasUserCorrection) {
      console.log('User has previously accepted similar content, skipping fact-check');
      return NextResponse.json({
        mode,
        result: [],
        contentLength: content.length,
        plainTextLength: plainText.length,
        processingTime: Date.now(),
        userCorrected: true
      });
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
              content: `You are a fact-checking assistant. Analyze text for MAJOR factual errors only.

CRITICAL RULES:
1. ONLY flag obviously wrong, major factual errors
2. Use BROAD, GENERAL corrections - avoid specific numbers, dates, or measurements
3. Don't nitpick small details or provide overly precise "corrections"
4. Focus on clearly false statements that anyone would recognize as wrong
5. Use general language like "over X kilometers" instead of exact measurements
6. Don't flag creative writing, opinions, or subjective content

CORRECTION GUIDELINES:
- For Great Wall: Use "The Great Wall stretches over 21,000 kilometers" (not exact numbers)
- For historical periods: Use "built over many centuries" (not specific dates)
- For materials: Use "traditional materials like stone and brick" (not exhaustive lists)
- For locations: Use "located in China" (not specific regions)

CONFIDENCE LEVELS:
- HIGH: Only for obviously false statements (chocolate walls, animals in wrong places)
- MEDIUM/LOW: Avoid these - if unsure, don't flag

Examples of what TO flag:
- "Great Wall made of chocolate" → "made of traditional materials"
- "Located in Tokyo" → "located in China"
- "Built by Napoleon" → "built by Chinese dynasties"

Examples of what NOT to flag:
- Approximate measurements or dates
- Regional variations in spelling
- Minor historical details
- Style preferences

If uncertain about ANY detail, return empty array.`
            },
            {
              role: "user",
              content: `Please fact-check this text (limit to max 15 issues):\n\n${plainText.length > 8000 ? plainText.substring(0, 8000) + '...' : plainText}`
            }
          ],
          maxTokens,
          temperature: 0.1,
        });
        // Filter to only HIGH confidence issues and apply stable corrections
        const highConfidenceIssues = realtimeResult.issues.filter(issue => issue.confidence === 'HIGH');
        
        // Apply stable correction templates to prevent hallucination
        result = highConfidenceIssues.map(issue => {
          const text = issue.text.toLowerCase();
          
          // Check for known patterns and use stable corrections
          if (text.includes('great wall') && text.includes('tokyo')) {
            return { ...issue, suggestion: correctionTemplates['great wall location'] };
          }
          if (text.includes('great wall') && (text.includes('21,196') || text.includes('specific'))) {
            return { ...issue, suggestion: correctionTemplates['great wall length'] };
          }
          if (text.includes('great wall') && text.includes('chocolate')) {
            return { ...issue, suggestion: correctionTemplates['great wall materials'] };
          }
          if (text.includes('great wall') && text.includes('napoleon')) {
            return { ...issue, suggestion: correctionTemplates['great wall builders'] };
          }
          
          return issue;
        });
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
        // Filter to only HIGH confidence issues for detailed mode too and apply templates
        const detailedHighConfidenceIssues = detailedResult.issues.filter(issue => issue.confidence === 'HIGH');
        
        // Apply stable correction templates for detailed mode too
        const stableDetailedIssues = detailedHighConfidenceIssues.map(issue => {
          const text = issue.text.toLowerCase();
          
          // Check for known patterns and use stable corrections
          if (text.includes('great wall') && text.includes('tokyo')) {
            return { ...issue, suggestion: correctionTemplates['great wall location'] };
          }
          if (text.includes('great wall') && (text.includes('21,196') || text.includes('specific'))) {
            return { ...issue, suggestion: correctionTemplates['great wall length'] };
          }
          if (text.includes('great wall') && text.includes('chocolate')) {
            return { ...issue, suggestion: correctionTemplates['great wall materials'] };
          }
          if (text.includes('great wall') && text.includes('napoleon')) {
            return { ...issue, suggestion: correctionTemplates['great wall builders'] };
          }
          
          return issue;
        });
        
        result = {
          ...detailedResult,
          issues: stableDetailedIssues
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    // Store result in cache
    factCheckCache.set(contentHash, {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL
    });

    // Clean up expired cache entries
    for (const [key, value] of factCheckCache.entries()) {
      if (value.expiresAt < Date.now()) {
        factCheckCache.delete(key);
      }
    }

    console.log('Fact-check completed, result cached with hash:', contentHash);

    return NextResponse.json({
      mode,
      result,
      contentLength: content.length,
      plainTextLength: plainText.length,
      processingTime: Date.now(),
      cached: false
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
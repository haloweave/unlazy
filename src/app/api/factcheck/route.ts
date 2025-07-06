import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import crypto from 'crypto';
import Exa from 'exa-js';

const exa = new Exa(process.env.EXA_API_KEY);

// Rate limiting for Exa API calls
const EXA_RATE_LIMIT_DELAY = 250; // 250ms delay between requests (4 requests per second, safely under 5/sec limit)
let lastExaCallTime = 0;

// Helper function to respect rate limits
async function rateLimitedExaCall<T>(apiCall: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastCall = now - lastExaCallTime;
  
  if (timeSinceLastCall < EXA_RATE_LIMIT_DELAY) {
    const delayNeeded = EXA_RATE_LIMIT_DELAY - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  
  lastExaCallTime = Date.now();
  return await apiCall();
}

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

// General patterns for identifying over-specific corrections
const OVER_SPECIFIC_PATTERNS = [
  /\d{4,}\s*(km|kilometers|miles|meters|feet|years|people|dollars)/i, // Specific numbers
  /exactly\s+\d+/i, // "exactly X"
  /precisely\s+\d+/i, // "precisely X"
  /\d+\.\d+\s*(km|meters|years|percent)/i, // Decimal numbers
  /\d+,\d+/i, // Comma-separated numbers like "21,196"
  /between\s+\d+\s+and\s+\d+/i, // Specific ranges
  /approximately\s+\d{4,}/i, // "approximately" with specific numbers
];

// Detect if a suggestion is overly specific/precise
function isOverlySpecific(suggestion: string): boolean {
  return OVER_SPECIFIC_PATTERNS.some(pattern => pattern.test(suggestion));
}

// Generalize overly specific suggestions
async function generalizeSpecificSuggestion(suggestion: string, originalText: string): Promise<string> {
  try {
    const { object: result } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        generalizedSuggestion: z.string()
      }),
      messages: [
        {
          role: "system",
          content: `You are a correction generalizer. Take overly specific/precise corrections and make them more general and less likely to be wrong.

RULES:
1. Replace specific numbers with general ranges (e.g., "21,196 km" → "over 21,000 km")
2. Replace exact dates with general periods (e.g., "220 BC" → "around 3rd century BC")
3. Keep corrections truthful but less precise
4. Use words like "over", "around", "approximately", "many", "several"
5. Avoid exact measurements, dates, or counts

Examples:
- "21,196 kilometers" → "over 21,000 kilometers"
- "built in 220 BC" → "built over many centuries"
- "weighs exactly 2.5 kg" → "weighs around 2-3 kg"
- "costs $1,234.56" → "costs over $1,000"
- "built by Emperor Qin in 220 BC" → "built by Chinese dynasties over many centuries"`
        },
        {
          role: "user",
          content: `Original text: "${originalText}"
Overly specific suggestion: "${suggestion}"

Please provide a more general version of this suggestion:`
        }
      ],
      temperature: 0.1,
    });

    return result.generalizedSuggestion;
  } catch (error) {
    console.error('Error generalizing suggestion:', error);
    // Fallback: simple pattern-based generalization
    return suggestion
      .replace(/\d{4,}\s*(km|kilometers)/gi, 'over $1')
      .replace(/exactly\s+\d+/gi, 'around')
      .replace(/precisely\s+\d+/gi, 'approximately')
      .replace(/\d+,\d+/g, 'over');
  }
}

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

// Additional hallucination detection patterns
const HALLUCINATION_INDICATORS = [
  /\b\d{1,2}:\d{2}\s*(AM|PM)\b/i, // Specific times
  /on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, // Specific days
  /in\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i, // Specific months/years
  /\$\d+\.\d{2}\b/i, // Exact dollar amounts
  /\b\d+\s*%\s*of\b/i, // Specific percentages
  /weighs?\s+exactly\s+\d+/i, // Exact weights
  /measures?\s+exactly\s+\d+/i, // Exact measurements
  /according\s+to\s+[a-z\s]+\s+study/i, // Fake study references
  /research\s+shows\s+that/i, // Vague research claims
];

// Detect potential AI hallucination in suggestions
function containsHallucination(suggestion: string): boolean {
  return HALLUCINATION_INDICATORS.some(pattern => pattern.test(suggestion));
}

// Detect if suggestion is making up "facts" not present in original
function isMakingUpFacts(originalText: string, suggestion: string): boolean {
  const originalWords = new Set(originalText.toLowerCase().split(/\W+/));
  const suggestionWords = suggestion.toLowerCase().split(/\W+/);
  
  // Count how many new "factual" words are introduced
  const factualWords = ['emperor', 'dynasty', 'century', 'bc', 'ad', 'built', 'constructed', 'located', 'made', 'consists'];
  const newFactualWords = suggestionWords.filter(word => 
    factualWords.includes(word) && !originalWords.has(word)
  );
  
  // If suggestion introduces many new factual terms, it might be hallucinating
  return newFactualWords.length > 2;
}

// Web-based fact verification using Exa.ai
async function verifyFactWithWebSearch(claim: string, originalText: string): Promise<{
  isVerified: boolean;
  webSources: Array<{title: string; url: string; relevantText: string}>;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}> {
  try {
    // Create search query for the factual claim
    const searchQuery = `${claim} facts verification`;
    
    // Search for authoritative sources with rate limiting
    const results = await rateLimitedExaCall(() => exa.searchAndContents(searchQuery, {
      type: 'neural',
      useAutoprompt: true,
      numResults: 3,
      text: true,
      highlights: true,
      includeImageUrls: false,
      includeDomains: [
        'wikipedia.org',
        'britannica.com',
        'nationalgeographic.com',
        'smithsonianmag.com',
        'history.com',
        'bbc.com',
        'reuters.com',
        'ap.org',
        'edu',
        'gov'
      ],
    }));

    if (!results.results || results.results.length === 0) {
      return {
        isVerified: false,
        webSources: [],
        confidence: 'LOW'
      };
    }

    // Process search results
    const webSources = results.results.map(result => ({
      title: result.title || 'Untitled',
      url: result.url,
      relevantText: (result.text || '').substring(0, 300) + '...'
    }));

    // Combine web content for verification
    const webContent = results.results
      .map(result => `Source: ${result.title || 'Untitled'}
Content: ${(result.text || '').substring(0, 500)}
Highlights: ${(result.highlights || []).join(' ')}`)
      .join('\n\n')
      .substring(0, 4000);

    // Use AI to verify the claim against web sources
    const { object: verification } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        isVerified: z.boolean().describe('Whether the original claim is factually accurate based on web sources'),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence level of verification'),
        explanation: z.string().describe('Brief explanation of verification result')
      }),
      messages: [
        {
          role: "system",
          content: `You are a fact-verification assistant. Compare the original claim with authoritative web sources and determine if the claim is factually accurate.

VERIFICATION RULES:
1. Only return HIGH confidence if web sources clearly support or contradict the claim
2. Return MEDIUM confidence if sources partially support the claim but with some uncertainty
3. Return LOW confidence if sources are unclear, contradictory, or insufficient
4. Focus on factual accuracy, not minor details or formatting
5. Consider the reliability and authority of the sources

Original claim to verify: "${claim}"
Original context: "${originalText}"`
        },
        {
          role: "user",
          content: `Please verify this claim against these authoritative sources:

${webContent}

Is the original claim factually accurate?`
        }
      ],
      maxTokens: 300,
      temperature: 0.1,
    });

    return {
      isVerified: verification.isVerified,
      webSources,
      confidence: verification.confidence
    };

  } catch (error) {
    console.error('Web verification failed:', error);
    
    // If it's a rate limit error, provide more specific feedback
    if (error instanceof Error && error.message.includes('rate limit')) {
      console.log('Rate limit encountered, falling back to AI-only verification');
    }
    
    return {
      isVerified: false,
      webSources: [],
      confidence: 'LOW'
    };
  }
}

// Enhanced fact-checking that combines AI detection with web verification
async function performEnhancedFactCheck(content: string, mode: 'realtime' | 'detailed'): Promise<FactCheckResult> {
  // First pass: AI-based fact checking to identify potential issues
  const aiFactCheckResult = await performAIFactCheck(content, mode);
  
  // Get issues array from AI result
  const aiIssues = Array.isArray(aiFactCheckResult) ? aiFactCheckResult : aiFactCheckResult.issues || [];
  
  // Second pass: Web verification for high-confidence AI issues (sequential processing)
  const enhancedIssues = [];
  
  for (const issue of aiIssues) {
    // Only verify HIGH confidence issues to avoid wasting API calls
    if (issue.confidence === 'HIGH') {
      console.log(`Web-verifying claim: "${issue.text}"`);
      
      try {
        const webVerification = await verifyFactWithWebSearch(issue.text, content);
        
        // If web sources contradict the AI's assessment, adjust confidence
        if (webVerification.isVerified && webVerification.confidence === 'HIGH') {
          // Web sources support the original text, so AI might be wrong
          enhancedIssues.push({
            ...issue,
            confidence: 'LOW' as const,
            suggestion: `${issue.suggestion} (Note: Some web sources may support the original text)`
          });
        } else if (!webVerification.isVerified && webVerification.confidence === 'HIGH') {
          // Web sources confirm the AI's finding
          enhancedIssues.push({
            ...issue,
            confidence: 'HIGH' as const,
            suggestion: `${issue.suggestion} `
          });
        } else {
          // Uncertain web verification, keep original issue
          enhancedIssues.push(issue);
        }
      } catch (error) {
        console.error(`Web verification failed for issue: ${issue.text}`, error);
        // If web verification fails, keep the original AI issue
        enhancedIssues.push(issue);
      }
    } else {
      // Keep non-HIGH confidence issues as-is
      enhancedIssues.push(issue);
    }
  }

  // Filter to only HIGH confidence issues after web verification
  const finalIssues = enhancedIssues.filter(issue => issue.confidence === 'HIGH');

  console.log(`Enhanced fact-check completed: ${aiIssues.length} AI issues → ${finalIssues.length} final issues after web verification`);

  // Return in the same format as the original
  if (mode === 'detailed' && !Array.isArray(aiFactCheckResult)) {
    return {
      ...aiFactCheckResult,
      issues: finalIssues
    };
  }
  
  return finalIssues;
}

// Original AI-based fact checking function (extracted from existing code)
async function performAIFactCheck(plainText: string, mode: 'realtime' | 'detailed'): Promise<FactCheckResult> {
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

      // Filter to only HIGH confidence issues and apply comprehensive anti-hallucination filtering
      const highConfidenceIssues = realtimeResult.issues.filter(issue => {
        // Basic confidence filter
        if (issue.confidence !== 'HIGH') return false;
        
        // Filter out hallucinated suggestions
        if (containsHallucination(issue.suggestion)) {
          console.log('Filtered out hallucinated suggestion:', issue.suggestion);
          return false;
        }
        
        // Filter out suggestions that make up facts not in original
        if (isMakingUpFacts(issue.text, issue.suggestion)) {
          console.log('Filtered out fact-making suggestion:', issue.suggestion);
          return false;
        }
        
        return true;
      });
      
      // Generalize overly specific suggestions to prevent precision hallucination
      result = await Promise.all(highConfidenceIssues.map(async issue => {
        if (isOverlySpecific(issue.suggestion)) {
          console.log('Detected overly specific suggestion, generalizing:', issue.suggestion);
          const generalizedSuggestion = await generalizeSpecificSuggestion(issue.suggestion, issue.text);
          return { ...issue, suggestion: generalizedSuggestion };
        }
        return issue;
      }));
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

      // Filter to only HIGH confidence issues for detailed mode with comprehensive filtering
      const detailedHighConfidenceIssues = detailedResult.issues.filter(issue => {
        // Basic confidence filter
        if (issue.confidence !== 'HIGH') return false;
        
        // Filter out hallucinated suggestions
        if (containsHallucination(issue.suggestion)) {
          console.log('Filtered out hallucinated suggestion in detailed mode:', issue.suggestion);
          return false;
        }
        
        // Filter out suggestions that make up facts not in original
        if (isMakingUpFacts(issue.text, issue.suggestion)) {
          console.log('Filtered out fact-making suggestion in detailed mode:', issue.suggestion);
          return false;
        }
        
        return true;
      });
      
      // Generalize overly specific suggestions for detailed mode too
      const generalizedDetailedIssues = await Promise.all(detailedHighConfidenceIssues.map(async issue => {
        if (isOverlySpecific(issue.suggestion)) {
          console.log('Detected overly specific suggestion in detailed mode, generalizing:', issue.suggestion);
          const generalizedSuggestion = await generalizeSpecificSuggestion(issue.suggestion, issue.text);
          return { ...issue, suggestion: generalizedSuggestion };
        }
        return issue;
      }));
      
      result = {
        ...detailedResult,
        issues: generalizedDetailedIssues
      };
      break;

    default:
      throw new Error('Invalid mode');
  }

  return result;
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

    console.log('Plain text sent to enhanced fact-check system:', plainText);

    // Use enhanced fact-checking with Exa.ai integration
    const result = await performEnhancedFactCheck(plainText, mode);

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

    console.log('Enhanced fact-check completed with Exa.ai verification, result cached with hash:', contentHash);

    return NextResponse.json({
      mode,
      result,
      contentLength: content.length,
      plainTextLength: plainText.length,
      processingTime: Date.now(),
      cached: false,
      enhanced: true // Flag to indicate enhanced fact-checking was used
    });

  } catch (error) {
    console.error('Error in enhanced fact-check API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
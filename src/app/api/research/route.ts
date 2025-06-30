import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import Exa from 'exa-js';
import OpenAI from 'openai';

const exa = new Exa(process.env.EXA_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, type = 'search', documentContent = '' } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Use LLM to enhance search query based on document context
    let enhancedQuery = query;
    if (documentContent && documentContent.length > 100) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a research assistant. Based on the user's document content and their research query, generate an enhanced search query that will find the most relevant and credible sources.

Context: You're helping someone write a research document. They need factual information, not opinions or generated content.

Rules:
1. Keep queries factual and specific
2. Include relevant keywords from the document context
3. Focus on finding credible, authoritative sources
4. Don't change the core intent of the original query
5. Return only the enhanced query, nothing else

Document context (last 500 chars): "${documentContent.slice(-500)}"

Original query: "${query}"

Enhanced query:`
            }
          ],
          max_tokens: 100,
          temperature: 0.3,
        });

        const enhancedResult = completion.choices[0]?.message?.content?.trim();
        if (enhancedResult && enhancedResult.length > 0) {
          enhancedQuery = enhancedResult;
        }
      } catch {
        console.log('LLM enhancement failed, using original query');
        // Continue with original query if LLM fails
      }
    }

    let results;

    switch (type) {
      case 'search':
        // General search for research
        results = await exa.searchAndContents(enhancedQuery, {
          type: 'neural',
          useAutoprompt: true,
          numResults: 5,
          text: true,
          highlights: true,
          includeImageUrls: false,
        });
        break;

      case 'factcheck':
        // Use OpenAI for fact-checking instead of Exa search
        return NextResponse.json({
          error: 'Fact-checking has been moved to /api/factcheck endpoint',
          message: 'Please use the dedicated fact-checking API'
        }, { status: 400 });

      case 'academic':
        // Academic and research-focused search
        results = await exa.searchAndContents(enhancedQuery, {
          type: 'neural',
          useAutoprompt: true,
          numResults: 4,
          text: true,
          highlights: true,
          includeImageUrls: false,
          includeDomains: [
            'scholar.google.com',
            'jstor.org',
            'pubmed.ncbi.nlm.nih.gov',
            'arxiv.org',
            'researchgate.net',
            'springer.com',
            'nature.com',
            'sciencedirect.com'
          ],
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid search type' }, { status: 400 });
    }

    // Process results to extract key information
    const processedResults = results.results.map((result) => ({
      title: result.title || 'Untitled',
      url: result.url,
      text: result.text ? result.text.substring(0, 500) + '...' : '',
      highlights: result.highlights || [],
      score: result.score,
      publishedDate: result.publishedDate || undefined,
      author: result.author || undefined,
    }));

    // Generate comprehensive summary from all search results
    let summary = '';
    let followUpQuestions: string[] = [];
    const sources: Array<{title: string, url: string, author?: string}> = [];

    if (results.results.length > 0) {
      try {
        // Combine all content from search results (limit to avoid rate limits)
        const combinedContent = results.results
          .map((result, index) => {
            sources.push({
              title: result.title || 'Untitled',
              url: result.url,
              author: result.author
            });
            
            // Limit text to first 800 characters to avoid rate limits
            const limitedText = (result.text || '').substring(0, 800);
            const limitedHighlights = (result.highlights || []).slice(0, 2).join(' ');
            
            return `Source ${index + 1} (${result.title || 'Untitled'}):
${limitedText}

${limitedHighlights}
---`;
          })
          .join('\n\n')
          .substring(0, 8000); // Further limit total content

        // Generate concise summary using OpenAI (like Perplexity)
        const summaryCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a research assistant that creates SUPER CONCISE summaries for an AI copilot sidebar. Your task is to synthesize information into an extremely brief, focused summary.

Guidelines:
1. Keep the summary EXTREMELY SHORT (50-100 words maximum)
2. Focus ONLY on the most essential answer to the user's query
3. Use 1-2 short paragraphs at most
4. Include only the most critical facts/dates
5. Use simple, clear language - no fancy formatting
6. Don't mention sources - just give the core information
7. Think of it as a quick answer snippet, not a detailed explanation
8. Prioritize brevity over completeness

User's research query: "${query}"`
            },
            {
              role: "user",
              content: `Please create a concise summary from these sources:

${combinedContent}`
            }
          ],
          max_tokens: 150,
          temperature: 0.3,
        });

        summary = summaryCompletion.choices[0]?.message?.content?.trim() || '';

        // Generate follow-up questions
        const questionsCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a research assistant that generates thoughtful follow-up questions based on a research query and summary. 

IMPORTANT: You must respond with ONLY a valid JSON array of strings, nothing else.

Generate 3-4 concise, specific follow-up questions that:
- Are naturally related to the original query and summary
- Are clickable and interesting - things users would genuinely want to know more about  
- End with a question mark
- Focus on different aspects: causes, effects, related topics, deeper details, comparisons, etc.
- Are under 15 words each

Original query: "${query}"

Response format example: ["Question 1?", "Question 2?", "Question 3?"]`
            },
            {
              role: "user",
              content: `Based on this summary, generate follow-up questions:

${summary}`
            }
          ],
          max_tokens: 200,
          temperature: 0.4,
        });

        try {
          const questionsText = questionsCompletion.choices[0]?.message?.content?.trim() || '';
          console.log('Raw questions response:', questionsText); // Debug log
          followUpQuestions = JSON.parse(questionsText);
        } catch (error) {
          console.log('JSON parsing failed for questions:', error);
          // Fallback if JSON parsing fails - try to extract questions manually
          const questionsText = questionsCompletion.choices[0]?.message?.content?.trim() || '';
          if (questionsText) {
            // Extract questions from plain text format
            const lines = questionsText.split('\n').filter(line => line.trim().endsWith('?'));
            followUpQuestions = lines.map(line => line.trim().replace(/^\d+\.\s*/, '').replace(/^[\-\*]\s*/, '')).slice(0, 4);
          } else {
            followUpQuestions = [];
          }
        }

      } catch (error) {
        console.error('Summary generation failed:', error);
        summary = 'Unable to generate summary. Please check individual sources below.';
        followUpQuestions = [];
      }
    }

    return NextResponse.json({
      query,
      enhancedQuery,
      type,
      summary,
      sources,
      followUpQuestions: followUpQuestions || [],
      results: processedResults,
      totalResults: results.results.length,
    });

  } catch (error) {
    console.error('Error in research API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
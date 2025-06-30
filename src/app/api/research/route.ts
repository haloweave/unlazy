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
      } catch (error) {
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
    const processedResults = results.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      text: result.text ? result.text.substring(0, 500) + '...' : '',
      highlights: result.highlights || [],
      score: result.score,
      publishedDate: result.publishedDate,
      author: result.author,
    }));

    return NextResponse.json({
      query,
      enhancedQuery,
      type,
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
import { NextRequest, NextResponse } from 'next/server';

interface GrammarSpellingIssue {
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

    if (!content || content.length < 10) {
      return NextResponse.json({ issues: [] });
    }

    // Here you would integrate with a grammar checking service like:
    // - LanguageTool API
    // - Grammarly API
    // - OpenAI GPT for grammar checking
    // - Microsoft Text Analytics API
    
    // For now, I'll create a mock implementation that simulates grammar and spelling issues
    const mockIssues: GrammarSpellingIssue[] = [];

    // Simple mock grammar/spelling checks
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    
    sentences.forEach((sentence: string) => {
      const trimmed = sentence.trim();
      
      // Mock spelling errors
      if (trimmed.includes('recieve')) {
        mockIssues.push({
          text: 'recieve',
          type: 'spelling',
          issue: 'Incorrect spelling',
          suggestion: 'receive',
          severity: 'error',
          position: { start: content.indexOf('recieve'), end: content.indexOf('recieve') + 7 }
        });
      }
      
      if (trimmed.includes('definately')) {
        mockIssues.push({
          text: 'definately',
          type: 'spelling',
          issue: 'Incorrect spelling',
          suggestion: 'definitely',
          severity: 'error',
          position: { start: content.indexOf('definately'), end: content.indexOf('definately') + 10 }
        });
      }

      // Mock grammar errors
      if (trimmed.includes('there is many')) {
        mockIssues.push({
          text: 'there is many',
          type: 'grammar',
          issue: 'Subject-verb disagreement',
          suggestion: 'there are many',
          severity: 'error',
          position: { start: content.indexOf('there is many'), end: content.indexOf('there is many') + 13 }
        });
      }

      if (trimmed.includes('I are')) {
        mockIssues.push({
          text: 'I are',
          type: 'grammar',
          issue: 'Incorrect verb form with first person singular',
          suggestion: 'I am',
          severity: 'error',
          position: { start: content.indexOf('I are'), end: content.indexOf('I are') + 5 }
        });
      }

      // Check for run-on sentences (very long sentences)
      if (trimmed.length > 200 && !trimmed.includes(',') && !trimmed.includes(';')) {
        mockIssues.push({
          text: trimmed.substring(0, 50) + '...',
          type: 'grammar',
          issue: 'This sentence may be too long and hard to read',
          suggestion: 'Consider breaking this into shorter sentences or adding punctuation',
          severity: 'suggestion'
        });
      }

      // Check for passive voice indicators
      const passiveIndicators = ['was done', 'were made', 'is being', 'has been'];
      passiveIndicators.forEach(indicator => {
        if (trimmed.toLowerCase().includes(indicator)) {
          const startIndex = content.toLowerCase().indexOf(indicator);
          mockIssues.push({
            text: indicator,
            type: 'grammar',
            issue: 'Passive voice detected',
            suggestion: 'Consider using active voice for clearer writing',
            severity: 'suggestion',
            position: { start: startIndex, end: startIndex + indicator.length }
          });
        }
      });
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({ 
      issues: mockIssues,
      message: 'Grammar and spelling check completed'
    });

  } catch (error) {
    console.error('Grammar check error:', error);
    return NextResponse.json(
      { error: 'Failed to check grammar and spelling' },
      { status: 500 }
    );
  }
}
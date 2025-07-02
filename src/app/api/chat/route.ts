import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, sessionId } = await request.json();

    // Ensure user exists in our database
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error selecting user:', selectError);
    }

    let userId: string;
    if (!existingUser) {
      // Create user if doesn't exist
      const userData = {
        clerk_user_id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
      };
      
      console.log('Creating user with data:', userData);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(userData)
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        console.error('Error details:', {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        });
        return NextResponse.json({ 
          error: 'Failed to create user',
          details: createError.message 
        }, { status: 500 });
      }
      
      if (!newUser) {
        console.error('No user data returned after creation');
        return NextResponse.json({ error: 'Failed to create user - no data returned' }, { status: 500 });
      }
      
      userId = newUser.id;
      console.log('User created successfully with ID:', userId);
    } else {
      userId = existingUser.id;
      console.log('User already exists with ID:', userId);
    }

    // Get conversation history to determine phase
    const { data: chatHistory } = await supabase
      .from('chats')
      .select('message, role, created_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    // Determine conversation phase
    let phase = 'initial';
    // Effort level tracking (for future use)
    // let lastPromptType = 'none';
    // let userEffortLevel = 'none';
    
    if (chatHistory && chatHistory.length > 0) {
      // Check if this is a new conversation or continuation
      const userMessages = chatHistory.filter(msg => msg.role === 'user');
      const assistantMessages = chatHistory.filter(msg => msg.role === 'gpt');
      
      if (userMessages.length > 1) {
        // User has responded to initial nudge
        phase = 'engaged';
      }
      
      // Check if user is stuck (says "not sure", "no idea", etc.)
      const lastUserMessage = userMessages[userMessages.length - 1]?.message?.toLowerCase() || '';
      const stuckPhrases = ['not sure', 'no idea', 'help me start', 'i don\'t know', 'unsure'];
      const isStuck = stuckPhrases.some(phrase => lastUserMessage.includes(phrase));
      
      // Check for repeated "not sure" responses
      const notSureCount = userMessages.filter(msg => 
        stuckPhrases.some(phrase => msg.message.toLowerCase().includes(phrase))
      ).length;
      
      if (notSureCount >= 2) {
        phase = 'repeated_stuck';
        // userEffortLevel = 'struggling';
      } else if (isStuck && phase === 'engaged') {
        phase = 'stuck';
        // userEffortLevel = 'needs_help';
      } else if (lastUserMessage.length > 0) {
        // User made some effort
        // userEffortLevel = 'trying';
      }
      
      if (assistantMessages.length > 0) {
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1].message;
        
        // Determine last prompt type
        if (lastAssistantMessage.includes('Where would you start') || 
            lastAssistantMessage.includes('What do you think') ||
            lastAssistantMessage.includes('What\'s your') ||
            lastAssistantMessage.includes('Before I help')) {
          // lastPromptType = 'nudge';
        } else if (lastAssistantMessage.includes('Let\'s') || 
                   lastAssistantMessage.includes('Want to') ||
                   lastAssistantMessage.includes('Try this')) {
          // lastPromptType = 'option';
        } else {
          // lastPromptType = 'insight';
        }
      }
    }

    // Save user message
    const { error: chatInsertError } = await supabase.from('chats').insert({
      user_id: userId,
      message,
      role: 'user',
      session_id: sessionId,
    });

    if (chatInsertError) {
      console.error('Error inserting chat:', chatInsertError);
    }

    // Generate thinking prompt only for initial phase
    let thinkingPrompt = '';
    if (phase === 'initial') {
      const thinkingPrompts = [
        "Where would you start?",
        "What's the logic behind that?",
        "What do you think's missing right now?",
        "What's your gut take on this?",
        "Any initial structure in your head?"
      ];
      thinkingPrompt = thinkingPrompts[Math.floor(Math.random() * thinkingPrompts.length)];
    }

    // Save thinking prompt if generated
    if (thinkingPrompt) {
      await supabase.from('chats').insert({
        user_id: userId,
        message: thinkingPrompt,
        role: 'gpt',
        session_id: sessionId,
      });
    }

    // Define schema for structured flashcard response
    const flashcardSchema = z.object({
      type: z.enum(['message', 'flashcards']).describe('Response type'),
      message: z.string().describe('The main response message'),
      options: z.array(z.object({
        label: z.string().describe('Option label (A, B, C)'),
        text: z.string().describe('Option text'),
        correct: z.boolean().describe('Whether this option is correct')
      })).optional().describe('Flashcard options if applicable')
    });

    // Generate AI response with phase-aware system prompt
    const { object: aiResponseObj } = await generateObject({
      model: openai('gpt-4o'),
      schema: flashcardSchema,
      messages: [
        {
          role: "system",
          content: `You are Unlazy AI — a thoughtful assistant designed to help users think smarter, not lazier.

Your job is to encourage reasoning before giving direct answers.

When a user asks a question that requires cognitive effort, do **not** immediately answer. Instead, guide them to think.

You have two options:

1. For simple or social interactions (e.g., "Hi", "How are you?", "What is 2 + 2?"), set type to "message" and reply normally in the message field.

2. For reasoning-based questions, set type to "flashcards" and provide three answer options. Only one option must be correct. Make all answers sound plausible to encourage critical thinking.

Do **not** explain anything until the user selects or types a response. Then, provide affirmation, correction, and continue the conversation.

Be warm, curious, and focused on helping the user learn — not just giving answers.`
        },
        {
          role: "user",
          content: message
        }
      ],
      maxTokens: 300,
      temperature: 0.7,
    });

    const aiResponse = aiResponseObj.message || "I'm here to help you think through this!";

    // Debug log: raw GPT response
    console.log("RAW GPT RESPONSE:", aiResponse);

    // Parse structured response
    const type = aiResponseObj.type || 'message';
    const options = aiResponseObj.options || null;
    const mainResponse = aiResponse;

    // Debug log: parsed flashcards
    console.log("PARSED FLASHCARDS:", options);

    // Save AI response (without options JSON)
    await supabase.from('chats').insert({
      user_id: userId,
      message: mainResponse,
      role: 'gpt',
      session_id: sessionId,
    });

    // Update brain metrics
    const { data: metrics } = await supabase
      .from('brain_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (metrics) {
      // Update existing metrics
      await supabase
        .from('brain_metrics')
        .update({
          brain_food_count: metrics.brain_food_count + 1,
          total_questions: metrics.total_questions + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      // Create new metrics
      await supabase.from('brain_metrics').insert({
        user_id: userId,
        brain_food_count: 1,
        total_questions: 1,
        total_thinking_time: 0,
        topics: [],
      });
    }

    return NextResponse.json({
      type,
      options,
      message: type === 'message' ? mainResponse : undefined,
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
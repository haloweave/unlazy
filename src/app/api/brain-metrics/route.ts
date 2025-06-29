import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our database
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get brain metrics
    const { data: metrics } = await supabase
      .from('brain_metrics')
      .select('*')
      .eq('user_id', dbUser.id)
      .single();

    // Get recent chats for topic analysis
    const { data: recentChats } = await supabase
      .from('chats')
      .select('message, role, timestamp')
      .eq('user_id', dbUser.id)
      .order('timestamp', { ascending: false })
      .limit(50);

    // Get weekly progress (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: weeklyChats } = await supabase
      .from('chats')
      .select('timestamp')
      .eq('user_id', dbUser.id)
      .gte('timestamp', sevenDaysAgo.toISOString());

    // Process weekly data
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayChats = weeklyChats?.filter(chat => {
        const chatDate = new Date(chat.timestamp);
        return chatDate.toDateString() === date.toDateString();
      }) || [];

      return {
        day: dayName,
        count: dayChats.length,
      };
    }).reverse();

    // Extract topics from recent messages (simple keyword extraction)
    const topics = new Set<string>();
    const topicKeywords = {
      'JavaScript': ['javascript', 'js', 'react', 'vue', 'angular', 'node'],
      'Python': ['python', 'django', 'flask', 'pandas', 'numpy'],
      'AI/ML': ['ai', 'machine learning', 'neural', 'gpt', 'openai'],
      'Philosophy': ['philosophy', 'ethics', 'morality', 'existence', 'meaning'],
      'Science': ['science', 'physics', 'chemistry', 'biology', 'research'],
      'Technology': ['tech', 'technology', 'software', 'hardware', 'computer'],
    };

    recentChats?.forEach(chat => {
      const message = chat.message.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => message.includes(keyword))) {
          topics.add(topic);
        }
      });
    });

    return NextResponse.json({
      metrics: metrics || {
        brain_food_count: 0,
        total_questions: 0,
        total_thinking_time: 0,
        topics: [],
      },
      weeklyProgress: weeklyData,
      topics: Array.from(topics),
      recentActivity: recentChats?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching brain metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
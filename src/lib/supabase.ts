import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  clerk_user_id: string
  email: string
  created_at: string
}

export interface Chat {
  id: string
  user_id: string
  message: string
  role: 'user' | 'gpt'
  timestamp: string
  topic_tag?: string
  session_id: string
}

export interface BrainMetrics {
  id: string
  user_id: string
  brain_food_count: number
  total_questions: number
  total_thinking_time: number
  topics: string[]
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
} 
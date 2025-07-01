-- Wipe and recreate database tables for unlazy.ai
-- Run this in your Supabase SQL editor

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS "brain_metrics" CASCADE;
DROP TABLE IF EXISTS "chats" CASCADE;
DROP TABLE IF EXISTS "documents" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Create users table
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_user_id" text NOT NULL UNIQUE,
  "email" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create documents table
CREATE TABLE "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create chats table
CREATE TABLE "chats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "message" text NOT NULL,
  "role" text NOT NULL,
  "timestamp" timestamp DEFAULT now() NOT NULL,
  "topic_tag" text,
  "session_id" text NOT NULL
);

-- Create brain_metrics table
CREATE TABLE "brain_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL UNIQUE,
  "brain_food_count" integer DEFAULT 0 NOT NULL,
  "total_questions" integer DEFAULT 0 NOT NULL,
  "total_thinking_time" integer DEFAULT 0 NOT NULL,
  "topics" jsonb DEFAULT '[]' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "brain_metrics" ADD CONSTRAINT "brain_metrics_user_id_users_clerk_user_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("clerk_user_id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_clerk_user_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("clerk_user_id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_clerk_user_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("clerk_user_id") ON DELETE no action ON UPDATE no action;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL ON "users" TO authenticated;
-- GRANT ALL ON "documents" TO authenticated;
-- GRANT ALL ON "chats" TO authenticated;
-- GRANT ALL ON "brain_metrics" TO authenticated;

-- Enable Row Level Security (optional, but recommended)
-- ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "brain_metrics" ENABLE ROW LEVEL SECURITY;

-- Create policies (uncomment and adjust as needed)
-- CREATE POLICY "Users can only see their own data" ON "users"
--   FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub');

-- CREATE POLICY "Users can only access their own documents" ON "documents"
--   FOR ALL USING (user_id = auth.jwt() ->> 'sub');

SELECT 'Database reset complete! Tables created successfully.' as status;
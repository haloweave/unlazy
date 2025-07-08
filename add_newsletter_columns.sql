-- Add newsletter columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "newsletter_dialog_shown" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "newsletter_subscribed" boolean DEFAULT false NOT NULL;
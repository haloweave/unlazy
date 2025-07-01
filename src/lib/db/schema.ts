import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core'

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Documents table
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkUserId),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Chat messages table
export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkUserId),
  message: text('message').notNull(),
  role: text('role').notNull(), // 'user' or 'gpt'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  topicTag: text('topic_tag'),
  sessionId: text('session_id').notNull(),
})

// Brain metrics table
export const brainMetrics = pgTable('brain_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkUserId).unique(),
  brainFoodCount: integer('brain_food_count').notNull().default(0),
  totalQuestions: integer('total_questions').notNull().default(0),
  totalThinkingTime: integer('total_thinking_time').notNull().default(0),
  topics: jsonb('topics').notNull().default('[]'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Export types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type Chat = typeof chats.$inferSelect
export type NewChat = typeof chats.$inferInsert
export type BrainMetrics = typeof brainMetrics.$inferSelect
export type NewBrainMetrics = typeof brainMetrics.$inferInsert
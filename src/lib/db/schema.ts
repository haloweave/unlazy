import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core'

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  newsletterDialogShown: boolean('newsletter_dialog_shown').default(false).notNull(),
  newsletterSubscribed: boolean('newsletter_subscribed').default(false).notNull(),
  documentCount: integer('document_count').default(0).notNull(),
  powerUserFeedbackShown: boolean('power_user_feedback_shown').default(false).notNull(),
})

// Documents table
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkUserId),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('documents_user_id_idx').on(table.userId),
  updatedAtIdx: index('documents_updated_at_idx').on(table.updatedAt),
}))

// Chat messages table
export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.clerkUserId),
  message: text('message').notNull(),
  role: text('role').notNull(), // 'user' or 'gpt'
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  topicTag: text('topic_tag'),
  sessionId: text('session_id').notNull(),
}, (table) => ({
  userIdIdx: index('chats_user_id_idx').on(table.userId),
  sessionIdIdx: index('chats_session_id_idx').on(table.sessionId),
}))

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
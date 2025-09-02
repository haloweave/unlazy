ALTER TABLE "users" ADD COLUMN "document_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "power_user_feedback_shown" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chats_session_id_idx" ON "chats" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
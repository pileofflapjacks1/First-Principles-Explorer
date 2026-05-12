import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const stripeProcessedSessionsTable = pgTable("stripe_processed_sessions", {
  stripeSessionId: text("stripe_session_id").primaryKey(),
  userId: text("user_id").notNull(),
  creditsAdded: integer("credits_added").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

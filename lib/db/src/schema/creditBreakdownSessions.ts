import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const creditBreakdownSessionsTable = pgTable("credit_breakdown_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  imagesRemaining: integer("images_remaining").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

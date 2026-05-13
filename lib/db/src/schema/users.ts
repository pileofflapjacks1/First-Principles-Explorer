import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  isPro: boolean("is_pro").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  imageCount: integer("image_count").notNull().default(0),
  imageCountResetAt: timestamp("image_count_reset_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  topicCredits: integer("topic_credits").notNull().default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof usersTable.$inferSelect;

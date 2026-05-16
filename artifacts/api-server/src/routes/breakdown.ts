import { Router, type IRouter } from "express";
import { and, eq, sql, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, usersTable, creditBreakdownSessionsTable } from "@workspace/db";
import {
  GenerateProBreakdownBody,
  RegenerateProGapsBody,
} from "@workspace/api-zod";
import { optionalAuth, requireAuth } from "../middlewares/auth";
import {
  generateBreakdownWithXai,
  regenerateGapsWithXai,
} from "../lib/xai-text";
import { FREE_BREAKDOWNS_PER_MONTH } from "../lib/usage";

const router: IRouter = Router();

async function getUserOrFail(
  userId: string,
): Promise<
  | { ok: true; user: typeof usersTable.$inferSelect }
  | { ok: false; status: number; error: string; creditsRequired?: boolean }
> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true, user };
}

router.post("/breakdown", optionalAuth, async (req, res): Promise<void> => {
  const parsed = GenerateProBreakdownBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Unauthenticated callers get 402 + creditsRequired (not 401) so the
  // frontend can direct them to sign in or buy credits.
  if (!req.userId) {
    res.status(402).json({ error: "Sign in to get 5 free breakdowns per month.", creditsRequired: true });
    return;
  }

  const userId = req.userId;
  const result = await getUserOrFail(userId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  const { user } = result;

  // Admins and Pro users go straight through with no quota checks.
  // Free users: try the free monthly quota first, then fall back to credits.
  let useFreeBreakdown = false;
  let useCredit = false;
  if (!user.isPro && !user.isAdmin) {
    // Atomically consume one free breakdown — combine the monthly reset and
    // the increment into a single UPDATE so concurrent requests can never
    // burst past the cap in the seconds around a month boundary.
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const freeUpdated = await db
      .update(usersTable)
      .set({
        freeBreakdownsUsed: sql`CASE WHEN free_breakdowns_reset_at < ${monthStart} THEN 1 ELSE free_breakdowns_used + 1 END`,
        freeBreakdownsResetAt: sql`CASE WHEN free_breakdowns_reset_at < ${monthStart} THEN ${now} ELSE free_breakdowns_reset_at END`,
      })
      .where(
        and(
          eq(usersTable.id, userId),
          sql`(free_breakdowns_reset_at < ${monthStart} OR free_breakdowns_used < ${FREE_BREAKDOWNS_PER_MONTH})`,
        ),
      )
      .returning({ freeBreakdownsUsed: usersTable.freeBreakdownsUsed });

    if (freeUpdated.length > 0) {
      useFreeBreakdown = true;
    } else {
      // Out of free breakdowns — try to atomically reserve one credit.
      const updated = await db
        .update(usersTable)
        .set({ topicCredits: sql`topic_credits - 1` })
        .where(and(eq(usersTable.id, userId), sql`topic_credits > 0`))
        .returning({ topicCredits: usersTable.topicCredits });

      if (updated.length === 0) {
        res.status(402).json({
          error: "You've used all 5 free breakdowns this month. Buy credits or upgrade to Pro to continue.",
          creditsRequired: true,
        });
        return;
      }
      useCredit = true;
    }
  }

  async function refundQuota(): Promise<void> {
    if (useCredit) {
      await db
        .update(usersTable)
        .set({ topicCredits: sql`topic_credits + 1` })
        .where(eq(usersTable.id, userId));
    } else if (useFreeBreakdown) {
      await db
        .update(usersTable)
        .set({ freeBreakdownsUsed: sql`GREATEST(free_breakdowns_used - 1, 0)` })
        .where(eq(usersTable.id, userId));
    }
  }

  const xaiKey = process.env["XAI_API_KEY"];
  if (!xaiKey) {
    req.log.error("XAI_API_KEY is not configured on the server");
    await refundQuota();
    res
      .status(500)
      .json({ error: "AI breakdown is not configured on the server." });
    return;
  }

  try {
    const data = await generateBreakdownWithXai(parsed.data.topic, xaiKey);
    // Create a DB-backed credit session so the frontend can call /images for
    // this specific breakdown. Both free-tier and paid-credit breakdowns get
    // a session so server-hosted images work for them.
    let creditSessionToken: string | undefined;
    if (useCredit || useFreeBreakdown) {
      const imagesRemaining =
        data.breakdown.filter((b) => !!b.image_prompt).length +
        (data.gaps ?? []).filter((g) => !!g.image_prompt).length;
      const sessionId = randomUUID();
      await db.insert(creditBreakdownSessionsTable).values({
        id: sessionId,
        userId,
        imagesRemaining,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
      creditSessionToken = sessionId;
    }
    res.json({ ...data, creditSessionToken, usedFreeBreakdown: useFreeBreakdown, usedCredit: useCredit });
  } catch (err) {
    req.log.error({ err }, "xAI breakdown failed");
    // Refund the reserved quota so a transient API error doesn't cost the user.
    await refundQuota();
    res
      .status(502)
      .json({ error: "Breakdown generation failed. Please try again." });
  }
});

router.post(
  "/breakdown/gaps",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = RegenerateProGapsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const userId = req.userId!;
    const userResult = await getUserOrFail(userId);
    if (!userResult.ok) {
      res.status(userResult.status).json({ error: userResult.error });
      return;
    }
    if (!userResult.user.isPro && !userResult.user.isAdmin) {
      res.status(402).json({ error: "AI gap regeneration requires the Pro tier." });
      return;
    }

    const xaiKey = process.env["XAI_API_KEY"];
    if (!xaiKey) {
      req.log.error("XAI_API_KEY is not configured on the server");
      res
        .status(500)
        .json({ error: "AI breakdown is not configured on the server." });
      return;
    }

    try {
      const gaps = await regenerateGapsWithXai(
        parsed.data.topic,
        parsed.data.breakdownTitles,
        xaiKey,
      );
      res.json({ gaps });
    } catch (err) {
      req.log.error({ err }, "xAI gaps regeneration failed");
      res
        .status(502)
        .json({ error: "Gap regeneration failed. Please try again." });
    }
  },
);

export default router;

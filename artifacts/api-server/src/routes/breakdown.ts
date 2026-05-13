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
  // frontend can direct them to buy credits or sign in.
  if (!req.userId) {
    res.status(402).json({ error: "No credits remaining.", creditsRequired: true });
    return;
  }

  const userId = req.userId;
  const result = await getUserOrFail(userId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  const { user } = result;

  // Admins and Pro users go straight through with no credit checks.
  // Free users: try to atomically reserve one credit before the expensive call.
  let useCredit = false;
  if (!user.isPro && !user.isAdmin) {
    // Attempt atomic decrement. If no row is affected, the user has no credits.
    const updated = await db
      .update(usersTable)
      .set({ topicCredits: sql`topic_credits - 1` })
      .where(and(eq(usersTable.id, userId), sql`topic_credits > 0`))
      .returning({ topicCredits: usersTable.topicCredits });

    if (updated.length === 0) {
      res.status(402).json({
        error: "No credits remaining.",
        creditsRequired: true,
      });
      return;
    }
    useCredit = true;
  }

  const xaiKey = process.env["XAI_API_KEY"];
  if (!xaiKey) {
    req.log.error("XAI_API_KEY is not configured on the server");
    // Refund the reserved credit so the user is not billed for a server error.
    if (useCredit) {
      await db
        .update(usersTable)
        .set({ topicCredits: sql`topic_credits + 1` })
        .where(eq(usersTable.id, userId));
    }
    res
      .status(500)
      .json({ error: "AI breakdown is not configured on the server." });
    return;
  }

  try {
    const data = await generateBreakdownWithXai(parsed.data.topic, xaiKey);
    // Create a DB-backed credit session so the frontend can call /images for
    // this specific breakdown. The session ID is a random UUID stored in
    // credit_breakdown_sessions. Image slots = number of prompts in the result.
    if (useCredit) {
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
      res.setHeader("X-Credit-Session", sessionId);
    }
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "xAI breakdown failed");
    // Refund the reserved credit so a transient API error doesn't cost the user.
    if (useCredit) {
      await db
        .update(usersTable)
        .set({ topicCredits: sql`topic_credits + 1` })
        .where(eq(usersTable.id, userId));
    }
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

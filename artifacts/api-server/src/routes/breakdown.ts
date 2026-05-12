import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GenerateProBreakdownBody,
  RegenerateProGapsBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
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

router.post("/breakdown", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateProBreakdownBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userId!;
  const result = await getUserOrFail(userId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  const { user } = result;

  // Pro users go straight through. Credit holders get one credit consumed.
  // Everyone else gets a 402.
  const useCredit = !user.isPro && user.topicCredits > 0;
  if (!user.isPro && !useCredit) {
    res.status(402).json({
      error: "AI breakdown requires the Pro tier or a topic credit.",
      creditsRequired: true,
    });
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
    const data = await generateBreakdownWithXai(parsed.data.topic, xaiKey);

    // Atomically decrement the credit now that the breakdown succeeded.
    if (useCredit) {
      await db
        .update(usersTable)
        .set({ topicCredits: sql`GREATEST(topic_credits - 1, 0)` })
        .where(eq(usersTable.id, userId));
    }

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "xAI breakdown failed");
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
    if (!userResult.user.isPro) {
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

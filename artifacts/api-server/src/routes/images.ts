import { Router, type IRouter } from "express";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, usersTable, creditBreakdownSessionsTable } from "@workspace/db";
import {
  GenerateProImageBody,
  GenerateProImageResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { generateImageWithXai } from "../lib/xai";
import {
  PRO_MONTHLY_IMAGE_LIMIT,
  isStaleResetWindow,
} from "../lib/usage";

const router: IRouter = Router();

router.post("/images", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateProImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userId!;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Credit session users (free tier with a valid breakdown session) bypass the
  // monthly Pro quota entirely — their image slots are bounded by the session
  // itself (one slot per image_prompt in the breakdown). They do not consume
  // from, nor are blocked by, the Pro imageCount counter.
  if (!user.isPro) {
    const sessionId = req.headers["x-credit-session"] as string | undefined;
    if (!sessionId) {
      res.status(402).json({ error: "Image generation requires the Pro tier or a valid credit session." });
      return;
    }
    // Atomically consume one image slot. If no row is updated the session is
    // invalid, expired, or all slots have been used.
    const [consumed] = await db
      .update(creditBreakdownSessionsTable)
      .set({ imagesRemaining: sql`images_remaining - 1` })
      .where(
        and(
          eq(creditBreakdownSessionsTable.id, sessionId),
          eq(creditBreakdownSessionsTable.userId, user.id),
          gt(creditBreakdownSessionsTable.imagesRemaining, 0),
          gt(creditBreakdownSessionsTable.expiresAt, new Date()),
        ),
      )
      .returning({ id: creditBreakdownSessionsTable.id });
    if (!consumed) {
      res.status(402).json({ error: "Image generation requires the Pro tier or a valid credit session." });
      return;
    }

    const xaiKey = process.env["XAI_API_KEY"];
    if (!xaiKey) {
      req.log.error("XAI_API_KEY is not configured on the server");
      res.status(500).json({ error: "Image generation is not configured on the server." });
      return;
    }
    try {
      const url = await generateImageWithXai(parsed.data.prompt, xaiKey);
      res.json(
        GenerateProImageResponse.parse({
          url,
          // Credit users don't have a monthly counter — return 0 so the
          // caller receives a valid response shape.
          imagesGeneratedThisMonth: 0,
        }),
      );
    } catch (err) {
      req.log.error({ err }, "xAI image generation failed");
      res.status(502).json({ error: "Image generation failed. Please try again." });
    }
    return;
  }

  // Pro users: enforce monthly image quota and track usage.
  let count = user.imageCount;
  if (isStaleResetWindow(user.imageCountResetAt)) {
    await db
      .update(usersTable)
      .set({ imageCount: 0, imageCountResetAt: new Date() })
      .where(eq(usersTable.id, user.id));
    count = 0;
  }

  if (count >= PRO_MONTHLY_IMAGE_LIMIT) {
    res.status(429).json({
      error:
        "Monthly image limit reached. Quota resets at the start of next month.",
    });
    return;
  }

  const xaiKey = process.env["XAI_API_KEY"];
  if (!xaiKey) {
    req.log.error("XAI_API_KEY is not configured on the server");
    res
      .status(500)
      .json({ error: "Image generation is not configured on the server." });
    return;
  }

  try {
    const url = await generateImageWithXai(parsed.data.prompt, xaiKey);
    const [updated] = await db
      .update(usersTable)
      .set({ imageCount: sql`${usersTable.imageCount} + 1` })
      .where(eq(usersTable.id, user.id))
      .returning();

    res.json(
      GenerateProImageResponse.parse({
        url,
        imagesGeneratedThisMonth: updated.imageCount,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "xAI image generation failed");
    res
      .status(502)
      .json({ error: "Image generation failed. Please try again." });
  }
});

export default router;

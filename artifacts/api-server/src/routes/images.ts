import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { validateCreditSessionToken } from "../lib/creditSession";
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

  // Pro users may always generate images.
  // Free users need a valid credit session token issued by POST /breakdown.
  if (!user.isPro) {
    const token = req.headers["x-credit-session"] as string | undefined;
    if (!validateCreditSessionToken(token, user.id)) {
      res
        .status(402)
        .json({ error: "Image generation requires the Pro tier or a valid credit session." });
      return;
    }
  }

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

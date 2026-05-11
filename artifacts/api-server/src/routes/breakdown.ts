import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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

async function assertPro(
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  if (!user.isPro)
    return {
      ok: false,
      status: 402,
      error: "AI breakdown requires the Pro tier.",
    };
  return { ok: true };
}

router.post("/breakdown", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateProBreakdownBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userId!;
  const gate = await assertPro(userId);
  if (!gate.ok) {
    res.status(gate.status).json({ error: gate.error });
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
    const gate = await assertPro(userId);
    if (!gate.ok) {
      res.status(gate.status).json({ error: gate.error });
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

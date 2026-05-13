import { Router, type IRouter } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, usersTable, creditBreakdownSessionsTable } from "@workspace/db";
import type { Request } from "express";
import { AnalyzeProStockBody, FindMoreCompaniesBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { analyzeStockWithXai, findMoreCompaniesWithXai } from "../lib/xai-text";

const router: IRouter = Router();

/**
 * Returns true if the request carries a valid (non-expired, user-owned) credit
 * breakdown session. Credit-session users get unmetered access to the
 * analysis/find-companies endpoints for the duration of the session — these
 * features are part of the same paid breakdown bundle as images.
 */
async function hasValidCreditSession(req: Request, userId: string): Promise<boolean> {
  const sessionId = req.headers["x-credit-session"] as string | undefined;
  if (!sessionId) return false;
  const [session] = await db
    .select({ id: creditBreakdownSessionsTable.id })
    .from(creditBreakdownSessionsTable)
    .where(
      and(
        eq(creditBreakdownSessionsTable.id, sessionId),
        eq(creditBreakdownSessionsTable.userId, userId),
        gt(creditBreakdownSessionsTable.expiresAt, new Date()),
      ),
    );
  return !!session;
}

router.post(
  "/stocks/find-companies",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = FindMoreCompaniesBody.safeParse(req.body);
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
    if (!user.isPro && !user.isAdmin) {
      const allowedViaCredit = await hasValidCreditSession(req, user.id);
      if (!allowedViaCredit) {
        res.status(402).json({
          error: "Finding companies requires the Pro tier or a valid credit session.",
        });
        return;
      }
    }

    const xaiKey = process.env["XAI_API_KEY"];
    if (!xaiKey) {
      req.log.error("XAI_API_KEY is not configured on the server");
      res.status(500).json({ error: "Company search is not configured on the server." });
      return;
    }

    try {
      const companies = await findMoreCompaniesWithXai(parsed.data, xaiKey);
      res.json({ companies });
    } catch (err) {
      req.log.error({ err }, "xAI find-companies failed");
      res.status(502).json({ error: "Company search failed. Please try again." });
    }
  },
);

router.post(
  "/stocks/analyze",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = AnalyzeProStockBody.safeParse(req.body);
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
    if (!user.isPro && !user.isAdmin) {
      const allowedViaCredit = await hasValidCreditSession(req, user.id);
      if (!allowedViaCredit) {
        res.status(402).json({
          error: "Stock analysis requires the Pro tier or a valid credit session.",
        });
        return;
      }
    }

    const xaiKey = process.env["XAI_API_KEY"];
    if (!xaiKey) {
      req.log.error("XAI_API_KEY is not configured on the server");
      res
        .status(500)
        .json({ error: "Stock analysis is not configured on the server." });
      return;
    }

    try {
      const analysis = await analyzeStockWithXai(parsed.data, xaiKey);
      res.json({ analysis });
    } catch (err) {
      req.log.error({ err }, "xAI stock analysis failed");
      res
        .status(502)
        .json({ error: "Stock analysis failed. Please try again." });
    }
  },
);

export default router;

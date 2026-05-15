import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GetMeResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  getMonthlyLimit,
  isStaleResetWindow,
  FREE_BREAKDOWNS_PER_MONTH,
} from "../lib/usage";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  // Reset stale monthly counters inline so the response reflects the real value
  let imageCount = user?.imageCount ?? 0;
  let freeBreakdownsUsed = user?.freeBreakdownsUsed ?? 0;
  if (user) {
    const patch: Partial<typeof usersTable.$inferInsert> = {};
    if (isStaleResetWindow(user.imageCountResetAt)) {
      patch.imageCount = 0;
      patch.imageCountResetAt = new Date();
      imageCount = 0;
    }
    if (isStaleResetWindow(user.freeBreakdownsResetAt)) {
      patch.freeBreakdownsUsed = 0;
      patch.freeBreakdownsResetAt = new Date();
      freeBreakdownsUsed = 0;
    }
    if (Object.keys(patch).length > 0) {
      await db.update(usersTable).set(patch).where(eq(usersTable.id, user.id));
    }
  }

  const isPro = user?.isPro ?? false;
  const isAdmin = user?.isAdmin ?? false;
  res.json(
    GetMeResponse.parse({
      userId,
      email: user?.email ?? null,
      isPro,
      isAdmin,
      imagesGeneratedThisMonth: imageCount,
      monthlyImageLimit: getMonthlyLimit(isPro),
      topicCredits: user?.topicCredits ?? 0,
      freeBreakdownsUsedThisMonth: freeBreakdownsUsed,
      freeBreakdownsPerMonth: FREE_BREAKDOWNS_PER_MONTH,
      subscriptionStatus: user?.subscriptionStatus ?? null,
      subscriptionCurrentPeriodEnd: user?.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
    }),
  );
});

export default router;

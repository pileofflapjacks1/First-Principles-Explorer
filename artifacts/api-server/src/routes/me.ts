import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GetMeResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { getMonthlyLimit, isStaleResetWindow } from "../lib/usage";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  // Reset stale monthly counter inline so the response reflects the real value
  let imageCount = user?.imageCount ?? 0;
  if (user && isStaleResetWindow(user.imageCountResetAt)) {
    await db
      .update(usersTable)
      .set({ imageCount: 0, imageCountResetAt: new Date() })
      .where(eq(usersTable.id, user.id));
    imageCount = 0;
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
    }),
  );
});

export default router;

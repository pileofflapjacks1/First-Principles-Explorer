import type { Request, Response, NextFunction } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Look up email so admins can identify users when flipping the `is_pro` flag.
  // Failure to fetch must not block the request — fall back to id-only upsert.
  let email: string | null = null;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  } catch (err) {
    req.log.warn({ err, userId }, "Failed to fetch Clerk user for email sync");
  }

  await db
    .insert(usersTable)
    .values({ id: userId, email })
    .onConflictDoUpdate({
      target: usersTable.id,
      // Only refresh email — never overwrite isPro / counters here.
      set: { email },
    });

  req.userId = userId;
  next();
}

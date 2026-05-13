import type { Request, Response, NextFunction } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Upsert a user row for the given Clerk userId. For returning users (row
 * already exists) we skip the Clerk API call entirely — their email is already
 * stored, and hitting Clerk on every request adds 100-300 ms of latency and a
 * hard dependency on Clerk availability. We only call Clerk on the very first
 * request (new user) to capture their email address.
 */
async function upsertUser(
  userId: string,
  log: { warn: (...a: unknown[]) => void },
): Promise<void> {
  // Fast path: returning user — row exists, skip Clerk fetch.
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (existing) return;

  // Slow path: new user — fetch email from Clerk once, then insert.
  let email: string | null = null;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  } catch (err) {
    log.warn({ err, userId }, "Failed to fetch Clerk user for email sync");
  }

  await db
    .insert(usersTable)
    .values({ id: userId, email })
    .onConflictDoNothing({ target: usersTable.id });
}

/**
 * Like requireAuth but never rejects the request — it only sets req.userId
 * when the caller is authenticated. Use this when the route itself decides
 * what status to return for unauthenticated calls (e.g. 402 instead of 401).
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (userId) {
    await upsertUser(userId, req.log);
    req.userId = userId;
  }

  next();
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

  await upsertUser(userId, req.log);
  req.userId = userId;
  next();
}

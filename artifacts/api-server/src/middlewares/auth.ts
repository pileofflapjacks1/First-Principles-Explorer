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
    let email: string | null = null;
    let emailFetched = false;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
      emailFetched = true;
    } catch (err) {
      req.log.warn({ err, userId }, "Failed to fetch Clerk user for email sync");
    }

    if (emailFetched && email !== null) {
      await db
        .insert(usersTable)
        .values({ id: userId, email })
        .onConflictDoUpdate({
          target: usersTable.id,
          set: { email },
        });
    } else {
      await db
        .insert(usersTable)
        .values({ id: userId, email })
        .onConflictDoNothing({ target: usersTable.id });
    }

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

  // Look up email so admins can identify users when flipping the `is_pro` flag.
  // Failure to fetch must not block the request — fall back to id-only upsert.
  let email: string | null = null;
  let emailFetched = false;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    emailFetched = true;
  } catch (err) {
    req.log.warn({ err, userId }, "Failed to fetch Clerk user for email sync");
  }

  // On insert always set whatever we have (may be null). On conflict only
  // overwrite email when we successfully fetched a non-null value, so a
  // transient Clerk fetch failure can't wipe a previously-stored email.
  if (emailFetched && email !== null) {
    await db
      .insert(usersTable)
      .values({ id: userId, email })
      .onConflictDoUpdate({
        target: usersTable.id,
        // Only refresh email — never overwrite isPro / counters here.
        set: { email },
      });
  } else {
    await db
      .insert(usersTable)
      .values({ id: userId, email })
      .onConflictDoNothing({ target: usersTable.id });
  }

  req.userId = userId;
  next();
}

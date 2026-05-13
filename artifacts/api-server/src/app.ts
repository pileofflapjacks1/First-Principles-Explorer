import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { stripeWebhookRouter } from "./routes/stripe";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the first proxy hop (Replit's reverse proxy). Required for
// express-rate-limit to read X-Forwarded-For without throwing a
// validation error, and for req.ip to reflect the real client IP.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk Frontend API proxy — must come before body parsers (proxy streams raw bytes).
// No-op in dev; only active in production.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Stripe webhook needs the raw body for signature verification — must be
// mounted BEFORE express.json().
app.use("/api", stripeWebhookRouter);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve the publishable key from the request host so the same server can
// serve multiple Clerk custom domains. Falls back to CLERK_PUBLISHABLE_KEY.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env["CLERK_PUBLISHABLE_KEY"],
    ),
  })),
);

// Rate limiting — protect expensive AI endpoints from abuse.
// Breakdown: max 10 requests per IP per 10 minutes (generous for real users).
const breakdownLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});

// Images: max 30 per IP per 10 minutes (~3 full breakdowns worth).
const imageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many image requests. Please wait a few minutes and try again." },
});

// General API: 300 req/min covers normal browsing without being exploitable.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

// Stocks AI: max 20 per IP per 10 minutes (each call hits xAI).
const stocksLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait a few minutes and try again." },
});

app.use("/api/breakdown", breakdownLimiter);
app.use("/api/images", imageLimiter);
app.use("/api/stocks", stocksLimiter);
app.use("/api", generalLimiter);
app.use("/api", router);

export default app;

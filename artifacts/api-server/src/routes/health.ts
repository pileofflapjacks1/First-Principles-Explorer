import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getXaiHealth } from "../lib/xai-text";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const aiHealth = getXaiHealth();

  const data = HealthCheckResponse.parse({
    status: "ok",
    ai: {
      status: aiHealth.status,
      // Legacy + new differentiated data
      consecutiveTransients: aiHealth.consecutiveTransients,
      rateLimitCount: aiHealth.rateLimitCount,
      otherTransientCount: aiHealth.otherTransientCount,
      cooldownRemainingMs: aiHealth.cooldownRemainingMs,
    },
  });

  res.json(data);
});

export default router;

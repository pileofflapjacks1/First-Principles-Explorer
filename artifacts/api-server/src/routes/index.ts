import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import imagesRouter from "./images";
import breakdownRouter from "./breakdown";
import stocksRouter from "./stocks";
import stripeRouter from "./stripe";
import debugRouter from "./debug";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(imagesRouter);
router.use(breakdownRouter);
router.use(stocksRouter);
router.use(stripeRouter);

// Debug endpoints mounted under /debug for clean namespacing
// Results in /api/debug/ai-circuit etc. (matches documentation)
router.use('/debug', debugRouter);

export default router;

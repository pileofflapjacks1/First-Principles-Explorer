import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import imagesRouter from "./images";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(imagesRouter);

export default router;

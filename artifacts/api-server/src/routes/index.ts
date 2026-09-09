import { Router, type IRouter } from "express";
import healthRouter from "./health";
import academicRouter from "./academic";
import adminRouter from "./admin";
import campusRouter from "./campus";

const router: IRouter = Router();

router.use(healthRouter);
router.use(academicRouter);
router.use(adminRouter);
router.use(campusRouter);

export default router;

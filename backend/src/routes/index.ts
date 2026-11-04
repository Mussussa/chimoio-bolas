import { Router } from "express";
import { adminRouter } from "./admin.js";
import { negotiationsRouter } from "./negotiations.js";
import { profileRouter } from "./profile.js";
import { reviewsRouter } from "./reviews.js";
import { servicesRouter } from "./services.js";
import { storesRouter } from "./stores.js";

export const apiRouter = Router();

apiRouter.use("/profile", profileRouter);
apiRouter.use(servicesRouter);
apiRouter.use(storesRouter);
apiRouter.use("/negotiations", negotiationsRouter);
apiRouter.use("/reviews", reviewsRouter);
apiRouter.use("/admin", adminRouter);

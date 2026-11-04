import { Router } from "express";
import { createReview } from "../controllers/reviewsController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const reviewsRouter = Router();

reviewsRouter.post("/", authenticate, requireRole("client"), validateRequest(requestSchemas.createReview), createReview);

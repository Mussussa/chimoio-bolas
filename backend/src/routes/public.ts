import { Router } from "express";
import {
  getPublicProduct,
  getPublicProvider,
  getPublicReviews,
  getPublicStore
} from "../controllers/publicController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const publicRouter = Router();

publicRouter.get("/stores/:slug", validateRequest(requestSchemas.storeSlugParams, "params"), getPublicStore);
publicRouter.get("/products/:id", validateRequest(requestSchemas.productIdParams, "params"), getPublicProduct);
publicRouter.get("/providers/:id", validateRequest(requestSchemas.providerIdParams, "params"), getPublicProvider);
publicRouter.get(
  "/reviews/:targetType/:targetId",
  validateRequest(requestSchemas.publicReviewParams, "params"),
  getPublicReviews
);

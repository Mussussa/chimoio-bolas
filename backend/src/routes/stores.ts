import { Router } from "express";
import { createProduct, registerStore, updateProductPrice } from "../controllers/storesController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const storesRouter = Router();

storesRouter.post("/stores/register", authenticate, validateRequest(requestSchemas.registerStore), registerStore);
storesRouter.post("/products", authenticate, requireRole("lojista"), validateRequest(requestSchemas.createProduct), createProduct);
storesRouter.patch(
  "/products/:id/price",
  authenticate,
  requireRole("lojista"),
  validateRequest(requestSchemas.productIdParams, "params"),
  validateRequest(requestSchemas.updateProductPrice),
  updateProductPrice
);

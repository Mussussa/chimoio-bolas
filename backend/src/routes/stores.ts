import { Router } from "express";
import { createProduct, registerStore, updateProductPrice } from "../controllers/storesController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const storesRouter = Router();

// Regista uma loja para o utilizador autenticado.
storesRouter.post("/stores/register", authenticate, validateRequest(requestSchemas.registerStore), registerStore);
// Cria um produto na loja do lojista autenticado.
storesRouter.post("/products", authenticate, requireRole("lojista"), validateRequest(requestSchemas.createProduct), createProduct);
// Actualiza o preço de um produto pertencente à loja do lojista autenticado.
storesRouter.patch(
  "/products/:id/price",
  authenticate,
  requireRole("lojista"),
  validateRequest(requestSchemas.productIdParams, "params"),
  validateRequest(requestSchemas.updateProductPrice),
  updateProductPrice
);

//backend/src/routes/stores.ts

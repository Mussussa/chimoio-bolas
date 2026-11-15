import { Router } from "express";
import { 
  getMyStore, 
  updateMyStore, 
  getMyProducts, 
  updateProduct, 
  deleteProduct 
} from "../controllers/merchantController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "../validation/schemas.js";

export const merchantRouter = Router();

// Todas as rotas requerem autenticação e o papel de 'lojista'
merchantRouter.use(authenticate, requireRole("lojista"));

// Gestão da Loja do Próprio Lojista
merchantRouter.get("/store/me", getMyStore);
merchantRouter.put("/store/me", validateRequest(requestSchemas.updateStore), updateMyStore);

// Gestão de Produtos do Lojista
merchantRouter.get("/products/me", getMyProducts);
merchantRouter.put(
  "/products/:id", 
  validateRequest(requestSchemas.productIdParams, "params"),
  validateRequest(requestSchemas.updateProduct), 
  updateProduct
);
merchantRouter.delete(
  "/products/:id", 
  validateRequest(requestSchemas.productIdParams, "params"), 
  deleteProduct
);
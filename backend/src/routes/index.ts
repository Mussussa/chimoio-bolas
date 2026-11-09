import { Router } from "express";
import { adminRouter } from "./admin.js";
import { negotiationsRouter } from "./negotiations.js";
import { profileRouter } from "./profile.js";
import { reviewsRouter } from "./reviews.js";
import { servicesRouter } from "./services.js";
import { storesRouter } from "./stores.js";

export const apiRouter = Router();

// Agrupa os endpoints de perfil do utilizador.
apiRouter.use("/profile", profileRouter);
// Agrupa o registo de prestadores e a publicação de serviços.
apiRouter.use(servicesRouter);
// Agrupa o registo de lojas e a gestão de produtos.
apiRouter.use(storesRouter);
// Agrupa o ciclo de vida das negociações.
apiRouter.use("/negotiations", negotiationsRouter);
// Agrupa os endpoints de avaliações.
apiRouter.use("/reviews", reviewsRouter);
// Agrupa os endpoints administrativos.
apiRouter.use("/admin", adminRouter);

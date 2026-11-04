import { Router } from "express";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { Product, Store, User } from "../models/index.js";
import { isUuid, isValidPrice } from "../domain/rules.js";
import { sendError, sendSuccess } from "../http/responses.js";

export const storesRouter = Router();

storesRouter.post("/stores/register", authenticate, async (req, res, next) => {
  try {
    const user = req.appUser as User;
    if (user.role !== "client" && user.role !== "lojista") {
      return sendError(res, 403, "Esta conta não pode registar uma loja.");
    }
    const { name, slug, category, description, address, latitude, longitude } = req.body as {
      name?: unknown; slug?: unknown; category?: unknown; description?: unknown;
      address?: unknown; latitude?: unknown; longitude?: unknown;
    };
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (typeof name !== "string" || !name.trim() || name.length > 160 ||
        typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 180 ||
        typeof category !== "string" || !category.trim() || category.length > 100 ||
        typeof description !== "string" || !description.trim() || description.length > 4000 ||
        typeof address !== "string" || !address.trim() || address.length > 500 ||
        !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return sendError(res, 400, "Preencha os dados da loja, slug e coordenadas válidas.");
    }
    if (await Store.findOne({ where: { ownerId: user.id } })) {
      return sendError(res, 409, "Esta conta já tem uma loja registada.");
    }

    const result = await Store.sequelize!.transaction(async (transaction) => {
      user.role = "lojista";
      await user.save({ transaction });
      return Store.create({
        ownerId: user.id,
        name: name.trim(),
        slug,
        category: category.trim(),
        description: description.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        verified: false
      }, { transaction });
    });
    return sendSuccess(res, { store: result, notice: "Loja criada e aguarda verificação administrativa." }, 201, "Loja registada.");
  } catch (error) {
    next(error);
  }
});

storesRouter.post("/products", authenticate, requireRole("lojista"), async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const store = await Store.findOne({ where: { ownerId: user.id } });
    if (!store) return sendError(res, 404, "Loja não encontrada para esta conta.");
    const { name, description, price, category, variants = [], images = [], minOrderQty = 1 } = req.body as {
      name?: unknown; description?: unknown; price?: unknown; category?: unknown;
      variants?: unknown; images?: unknown; minOrderQty?: unknown;
    };
    const amount = Number(price);
    const minimum = Number(minOrderQty);
    if (typeof name !== "string" || !name.trim() || name.length > 160 ||
        typeof description !== "string" || !description.trim() || description.length > 4000 ||
        !isValidPrice(amount) ||
        typeof category !== "string" || !category.trim() || category.length > 100 ||
        !Array.isArray(variants) || !Array.isArray(images) || images.length > 12 ||
        images.some((image) => typeof image !== "string" || image.length > 2000) ||
        !Number.isInteger(minimum) || minimum < 1 || minimum > 100_000) {
      return sendError(res, 400, "Dados do produto, preço ou quantidade mínima inválidos.");
    }
    const product = await Product.create({
      storeId: store.id,
      name: name.trim(),
      description: description.trim(),
      price: amount.toFixed(2),
      category: category.trim(),
      variants: variants as Record<string, unknown>[],
      images: images as string[],
      minOrderQty: minimum
    });
    return sendSuccess(res, { product }, 201, "Produto criado.");
  } catch (error) {
    next(error);
  }
});

storesRouter.patch("/products/:id/price", authenticate, requireRole("lojista"), async (req, res, next) => {
  try {
    const productId = req.params.id;
    if (!isUuid(productId)) return sendError(res, 400, "Identificador de produto inválido.");
    const amount = Number(req.body.price);
    if (!isValidPrice(amount) || amount > 1_000_000_000) {
      return sendError(res, 400, "O preço deve ser positivo e não exceder 1.000.000.000 MT.");
    }
    const user = req.appUser as User;
    const store = await Store.findOne({ where: { ownerId: user.id } });
    const product = store ? await Product.findOne({ where: { id: productId, storeId: store.id } }) : null;
    if (!product) return sendError(res, 404, "Produto não encontrado nesta loja.");
    product.price = amount.toFixed(2);
    await product.save();
    return sendSuccess(res, { product }, 200, "Preço actualizado em MT.");
  } catch (error) {
    next(error);
  }
});

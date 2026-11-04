import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../http/responses.js";
import { Product, Store, User } from "../models/index.js";

export const registerStore: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    if (user.role !== "client" && user.role !== "lojista") {
      return sendError(res, 403, "Esta conta não pode registar uma loja.");
    }
    const { name, slug, category, description, address, latitude, longitude } = req.body as {
      name: string; slug: string; category: string; description: string;
      address: string; latitude: number; longitude: number;
    };
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (await Store.findOne({ where: { ownerId: user.id } })) {
      return sendError(res, 409, "Esta conta já tem uma loja registada.");
    }
    const store = await Store.sequelize!.transaction(async (transaction) => {
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
    return sendSuccess(res, { store, notice: "Loja criada e aguarda verificação administrativa." }, 201, "Loja registada.");
  } catch (error) {
    next(error);
  }
};

export const createProduct: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const store = await Store.findOne({ where: { ownerId: user.id } });
    if (!store) return sendError(res, 404, "Loja não encontrada para esta conta.");
    const { name, description, price, category, variants = [], images = [], minOrderQty = 1 } = req.body as {
      name: string; description: string; price: number; category: string;
      variants?: unknown[]; images?: string[]; minOrderQty?: number;
    };
    const amount = Number(price);
    const minimum = Number(minOrderQty);
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
};

export const updateProductPrice: RequestHandler = async (req, res, next) => {
  try {
    const productId = req.params.id as string;
    const amount = Number(req.body.price);
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
};

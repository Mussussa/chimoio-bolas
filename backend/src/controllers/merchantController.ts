import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../http/responses.js";
import { Product, Store, User } from "../models/index.js";

// Obter os detalhes da loja do lojista autenticado
export const getMyStore: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const store = await Store.findOne({ where: { ownerId: user.id } });
    if (!store) return sendError(res, 404, "Ainda não possui nenhuma loja registada.");
    return sendSuccess(res, { store }, 200, "Dados da loja carregados.");
  } catch (error) {
    next(error);
  }
};

// Atualizar os dados e o logótipo da loja do lojista autenticado
export const updateMyStore: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const store = await Store.findOne({ where: { ownerId: user.id } });
    if (!store) return sendError(res, 404, "Loja não encontrada.");

    const { name, slug, category, description, address, latitude, longitude, logoUrl } = req.body as {
      name: string;
      slug: string;
      category: string[];
      description: string;
      address: string;
      latitude?: number | null | string;
      longitude?: number | null | string;
      logoUrl?: string | null;
    };

    const lat = latitude !== undefined && latitude !== null && latitude !== "" ? Number(latitude) : null;
    const lng = longitude !== undefined && longitude !== null && longitude !== "" ? Number(longitude) : null;

    store.name = name.trim();
    store.slug = slug.trim();
    store.category = category as any;
    store.description = description.trim();
    store.address = address.trim();
    store.latitude = lat;
    store.longitude = lng;
    if (logoUrl !== undefined) {
      store.logoUrl = logoUrl?.trim() || null;
    }

    await store.save();

    return sendSuccess(res, { store }, 200, "Loja atualizada com sucesso.");
  } catch (error) {
    next(error);
  }
};

// Listar todos os produtos da loja do lojista autenticado
export const getMyProducts: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const store = await Store.findOne({ where: { ownerId: user.id } });
    if (!store) return sendError(res, 404, "Loja não encontrada.");

    const products = await Product.findAll({
      where: { storeId: store.id },
      order: [["createdAt", "DESC"]]
    });

    return sendSuccess(res, { products }, 200, "Produtos da loja carregados.");
  } catch (error) {
    next(error);
  }
};

// Atualizar um produto existente da loja
export const updateProduct: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const productId = req.params.id as string;
    const store = await Store.findOne({ where: { ownerId: user.id } });
    if (!store) return sendError(res, 404, "Loja não encontrada.");

    const product = await Product.findOne({ where: { id: productId, storeId: store.id } });
    if (!product) return sendError(res, 404, "Produto não encontrado nesta loja.");

    const { name, description, price, category, images, minOrderQty } = req.body;

    product.name = name.trim();
    product.description = description.trim();
    product.price = Number(price).toFixed(2);
    product.category = category.trim();
    if (images && Array.isArray(images)) product.images = images;
    if (minOrderQty) product.minOrderQty = Number(minOrderQty);

    await product.save();

    return sendSuccess(res, { product }, 200, "Produto atualizado com sucesso.");
  } catch (error) {
    next(error);
  }
};

// Apagar um produto da loja
export const deleteProduct: RequestHandler = async (req, res, next) => {
  try {
    const user = req.appUser as User;
    const productId = req.params.id as string;
    const store = await Store.findOne({ where: { ownerId: user.id } });
    if (!store) return sendError(res, 404, "Loja não encontrada.");

    const product = await Product.findOne({ where: { id: productId, storeId: store.id } });
    if (!product) return sendError(res, 404, "Produto não encontrado nesta loja.");

    await product.destroy();

    return sendSuccess(res, null, 200, "Produto removido com sucesso.");
  } catch (error) {
    next(error);
  }
};
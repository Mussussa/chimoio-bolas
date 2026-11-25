import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Review, Store, User } from "../models/index.js";
import { createReview } from "./reviewsController.js";
import { getPublicReviews } from "./publicController.js";

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn()
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("interacções com lojas não verificadas", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("permite registar avaliação para uma loja não verificada", async () => {
    vi.spyOn(Store, "findByPk").mockResolvedValue({
      id: "store-id",
      ownerId: "store-owner-id",
      verified: false
    } as never);
    vi.spyOn(Review, "create").mockResolvedValue({ id: "review-id" } as never);

    const response = createResponse();
    const next = vi.fn();
    await createReview({
      appUser: { id: "client-id" } as User,
      body: { targetType: "store", targetId: "store-id", rating: 5, comment: "Boa loja" }
    } as Request, response as unknown as Response, next);

    expect(response.status).toHaveBeenCalledWith(201);
    expect(Review.create).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it("devolve avaliações de uma loja não verificada", async () => {
    vi.spyOn(Store, "findByPk").mockResolvedValue({ id: "store-id", verified: false } as never);
    vi.spyOn(Review, "findAll").mockResolvedValue([] as never);

    const response = createResponse();
    const next = vi.fn();
    await getPublicReviews({
      params: { targetType: "store", targetId: "store-id" }
    } as unknown as Request, response as unknown as Response, next);

    expect(Store.findByPk).toHaveBeenCalledWith("store-id", { attributes: ["id"] });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});

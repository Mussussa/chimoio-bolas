import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Review, Store, User } from "../models/index.js";
import { createReview } from "./reviewsController.js";
import { getPublicReviews } from "./publicController.js";
import { requestSchemas } from "../validation/schemas.js";

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
    vi.spyOn(Review, "findByPk").mockResolvedValue({
      toJSON: () => ({
        id: "review-id",
        rating: 5,
        comment: "Boa loja",
        imageUrl: "https://example.test/review.jpg",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        client: { name: "Ana", avatarUrl: "/ana.jpg", email: "private@example.com" }
      })
    } as never);

    const response = createResponse();
    const next = vi.fn();
    await createReview({
      appUser: { id: "client-id" } as User,
      body: { targetType: "store", targetId: "store-id", rating: 5, comment: "Boa loja", imageUrl: "https://example.test/review.jpg" }
    } as Request, response as unknown as Response, next);

    expect(response.status).toHaveBeenCalledWith(201);
    expect(Review.create).toHaveBeenCalledOnce();
    expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({
      imageUrl: "https://example.test/review.jpg"
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        review: {
          id: "review-id",
          rating: 5,
          comment: "Boa loja",
          imageUrl: "https://example.test/review.jpg",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          client: { name: "Ana", avatarUrl: "/ana.jpg" }
        }
      }
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it("devolve avaliações de uma loja não verificada", async () => {
    vi.spyOn(Store, "findByPk").mockResolvedValue({ id: "store-id", verified: false } as never);
    vi.spyOn(Review, "findAll").mockResolvedValue([{
      toJSON: () => ({
        id: "review-id",
        rating: 5,
        comment: "Boa loja",
        imageUrl: "https://example.test/review.jpg",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        client: { id: "client-id", name: "Ana", avatarUrl: "/ana.jpg", email: "private@example.com" }
      })
    }] as never);

    const response = createResponse();
    const next = vi.fn();
    await getPublicReviews({
      params: { targetType: "store", targetId: "store-id" }
    } as unknown as Request, response as unknown as Response, next);

    expect(Store.findByPk).toHaveBeenCalledWith("store-id", { attributes: ["id"] });
    expect(Review.findAll).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ["id", "rating", "comment", "imageUrl", "createdAt"],
      include: [{ model: User, as: "client", attributes: ["name", "avatarUrl"] }]
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        reviews: [{
          id: "review-id",
          rating: 5,
          comment: "Boa loja",
          imageUrl: "https://example.test/review.jpg",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          client: { name: "Ana", avatarUrl: "/ana.jpg" }
        }]
      }
    }));
    expect(response.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("valida o URL opcional da fotografia da avaliação", () => {
    const valid = requestSchemas.createReview.validate({
      targetType: "store",
      targetId: "00000000-0000-4000-8000-000000000001",
      rating: 5,
      imageUrl: "https://example.test/review.jpg"
    });
    const invalid = requestSchemas.createReview.validate({
      targetType: "store",
      targetId: "00000000-0000-4000-8000-000000000001",
      rating: 5,
      imageUrl: "not-a-url"
    });

    expect(valid.error).toBeUndefined();
    expect(invalid.error).toBeDefined();
  });
});

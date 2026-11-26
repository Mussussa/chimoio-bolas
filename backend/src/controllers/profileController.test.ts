import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestSchemas } from "../validation/schemas.js";
import { updateProfile } from "./profileController.js";

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn()
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("updateProfile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("valida e guarda os novos dados pessoais", async () => {
    const body = {
      name: "Ana",
      ageGroup: "25-34",
      neighborhood: "Bairro Nhamaonha",
      avatarUrl: "https://storage.example/ana.jpg"
    };
    expect(requestSchemas.updateProfile.validate(body).error).toBeUndefined();

    const user = {
      id: "user-id",
      name: "Ana",
      email: "ana@example.com",
      phone: null,
      avatarUrl: null as string | null,
      ageGroup: null as string | null,
      neighborhood: null as string | null,
      role: "client",
      save: vi.fn().mockResolvedValue(undefined)
    };
    const response = createResponse();
    const next = vi.fn();

    await updateProfile({
      appUser: user,
      body
    } as unknown as Request, response as unknown as Response, next);

    expect(user).toMatchObject({
      avatarUrl: body.avatarUrl,
      ageGroup: body.ageGroup,
      neighborhood: body.neighborhood
    });
    expect(user.save).toHaveBeenCalledOnce();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        avatarUrl: body.avatarUrl,
        ageGroup: body.ageGroup,
        neighborhood: body.neighborhood
      })
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it("rejeita faixas etárias fora dos valores permitidos", () => {
    expect(requestSchemas.updateProfile.validate({
      name: "Ana",
      ageGroup: "17-20"
    }).error).toBeDefined();
  });
});

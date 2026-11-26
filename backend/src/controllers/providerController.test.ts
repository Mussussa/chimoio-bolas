import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Service, ServiceProvider } from "../models/index.js";
import { requestSchemas } from "../validation/schemas.js";
import { updateMyProvider } from "./providerController.js";

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn()
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("updateMyProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserva categorias antigas já guardadas no perfil", async () => {
    const provider = {
      id: "provider-id",
      category: ["Categoria antiga"],
      save: vi.fn().mockResolvedValue(undefined)
    };
    const user = {
      id: "user-id",
      name: "Prestador",
      avatarUrl: null,
      save: vi.fn().mockResolvedValue(undefined),
      sequelize: {
        transaction: vi.fn(async (callback: (transaction: object) => Promise<unknown>) => callback({}))
      }
    };
    vi.spyOn(ServiceProvider, "findOne").mockResolvedValue(provider as never);
    vi.spyOn(Service, "findAll").mockResolvedValue([] as never);

    const response = createResponse();
    const next = vi.fn();
    const body = {
      name: "Prestador",
      category: ["Categoria antiga"],
      bio: "Experiência profissional",
      basePrice: 100,
      neighborhood: "Centro / Comércio",
      avatarUrl: "https://storage.example/profile.jpg"
    };
    expect(requestSchemas.updateProvider.validate(body).error).toBeUndefined();

    await updateMyProvider({
      appUser: user,
      body
    } as unknown as Request, response as unknown as Response, next);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(provider.category).toEqual(["Categoria antiga"]);
    expect(next).not.toHaveBeenCalled();
  });

  it("não permite acrescentar categorias fora da lista oficial", async () => {
    const provider = {
      id: "provider-id",
      category: ["Categoria antiga"]
    };
    const user = { id: "user-id" };
    vi.spyOn(ServiceProvider, "findOne").mockResolvedValue(provider as never);
    const findServices = vi.spyOn(Service, "findAll");

    const response = createResponse();
    const next = vi.fn();
    const body = {
      name: "Prestador",
      category: ["Categoria inventada"],
      bio: "Experiência profissional",
      basePrice: 100,
      neighborhood: "Centro / Comércio",
      avatarUrl: "https://storage.example/profile.jpg"
    };
    expect(requestSchemas.updateProvider.validate(body).error).toBeUndefined();

    await updateMyProvider({
      appUser: user,
      body
    } as unknown as Request, response as unknown as Response, next);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "A área “Categoria inventada” não é permitida."
    }));
    expect(findServices).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("exige o bairro ao registar um prestador", () => {
    const body = {
      category: ["Construção"],
      bio: "Experiência profissional",
      basePrice: 100
    };

    expect(requestSchemas.registerProvider.validate(body).error).toBeDefined();
    expect(requestSchemas.registerProvider.validate({
      ...body,
      neighborhood: "Centro / Comércio"
    }).error).toBeUndefined();
  });
});

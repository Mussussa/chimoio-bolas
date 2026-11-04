import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("API Express", () => {
  it("expõe healthcheck sem credenciais", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "API operacional.", data: { ok: true } });
  });

  it("recusa publicar serviços sem sessão autenticada", async () => {
    const response = await request(app).post("/api/services").send({
      title: "Serviço não autorizado",
      description: "Sem sessão",
      price: 100,
      deliveryTime: "hoje"
    });
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error_code: "UNAUTHORIZED" });
  });

  it("recusa alteração de preço sem sessão autenticada", async () => {
    const response = await request(app).patch("/api/products/11111111-1111-4111-8111-111111111111/price").send({ price: 1 });
    expect(response.status).toBe(401);
  });

  it("não expõe rotas de escrita antigas nem rotas inexistentes", async () => {
    const response = await request(app).get("/api/state");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Rota não encontrada: GET /api/state",
      error_code: "NOT_FOUND"
    });
  });

  it("devolve erros de JSON inválido no formato padronizado", async () => {
    const response = await request(app)
      .post("/api/profile/me")
      .set("content-type", "application/json")
      .send("{");
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: "O pedido não pôde ser processado.",
      error_code: "VALIDATION_ERROR"
    });
  });
});

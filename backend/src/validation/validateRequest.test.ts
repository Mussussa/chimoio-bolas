import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { validateRequest } from "../middleware/validateRequest.js";
import { requestSchemas } from "./schemas.js";
import { sendSuccess } from "../http/responses.js";

const app = express();
app.use(express.json());
app.post("/products", validateRequest(requestSchemas.createProduct), (req, res) => {
  res.json(req.body);
});
app.post("/negotiations/:id/messages", validateRequest(requestSchemas.createMessage), (_req, res) => {
  res.sendStatus(204);
});
app.patch(
  "/products/:id/price",
  validateRequest(requestSchemas.productIdParams, "params"),
  validateRequest(requestSchemas.updateProductPrice),
  (_req, res) => sendSuccess(res, { ok: true })
);
app.post("/services", validateRequest(requestSchemas.publishService), (req, res) => res.json(req.body));
app.patch("/profile", validateRequest(requestSchemas.updateProfile), (req, res) => res.json(req.body));

describe("validação Joi", () => {
  it("converte números recebidos como texto e aplica valores padrão", async () => {
    const response = await request(app).post("/products").send({
      name: "Arroz",
      description: "Arroz local",
      price: "250.50",
      category: "Alimentação & Bebidas",
      images: []
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ price: 250.5, variants: [], images: [], minOrderQty: 1 });
  });

  it("devolve uma mensagem amigável quando um campo obrigatório falta", async () => {
    const response = await request(app).post("/products").send({ name: "Arroz" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error_code: "VALIDATION_ERROR"
    });
    expect(response.body.message).toContain('"O preço" é obrigatório.');
    expect(response.body.message).not.toContain("ValidationError");
  });

  it("rejeita campos que não fazem parte do contrato", async () => {
    const response = await request(app).post("/products").send({
      name: "Arroz",
      description: "Arroz local",
      price: 250,
      category: "Alimentação",
      isAdmin: true
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('O campo "isAdmin" não é permitido.');
  });

  it("exige um valor positivo quando a mensagem é uma proposta", async () => {
    const response = await request(app).post("/negotiations/abc/messages").send({
      content: "Proponho este valor",
      messageType: "proposal"
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('"O valor da proposta" é obrigatório.');
  });

  it("valida os parâmetros da rota antes de executar a operação", async () => {
    const response = await request(app).patch("/products/not-a-uuid/price").send({ price: 250 });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('"O identificador do produto" tem um formato inválido.');
  });

  it("preserva a regra de valor monetário mínimo para preços de catálogo", async () => {
    const response = await request(app).post("/products").send({
      name: "Arroz",
      description: "Arroz local",
      price: 0.001,
      category: "Alimentação"
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('"O preço" deve ser um valor monetário válido em MT.');
  });

  it("valida categoria e fotografias ao publicar um serviço", async () => {
    const response = await request(app).post("/services").send({
      title: "Instalação elétrica",
      description: "Instalação e revisão residencial",
      category: "Eletricidade",
      price: "1250",
      deliveryTime: "2 horas",
      images: ["https://storage.example/servico.jpg"]
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      category: "Eletricidade",
      price: 1250,
      images: ["https://storage.example/servico.jpg"]
    });
  });

  it("aceita o URL da fotografia de perfil no contrato de perfil", async () => {
    const response = await request(app).patch("/profile").send({
      name: "Ana Prestadora",
      avatarUrl: "https://storage.example/perfil.jpg"
    });

    expect(response.status).toBe(200);
    expect(response.body.avatarUrl).toBe("https://storage.example/perfil.jpg");
  });
});

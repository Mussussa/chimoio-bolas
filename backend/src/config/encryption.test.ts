import { beforeEach, describe, expect, it } from "vitest";
import { Sequelize } from "sequelize";
import { decryptField, encryptField } from "./encryption.js";
import { decryptModelField, initializeModels, Negotiation, ServiceProvider, User } from "../models/index.js";

const testKey = Buffer.alloc(32, 7).toString("base64");
const sequelize = new Sequelize("postgres://test:test@127.0.0.1:5432/test", { logging: false });
initializeModels(sequelize);

describe("encriptação AES-256-GCM em repouso", () => {
  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = testKey;
  });

  it("mantém o esquema aberto sem tabelas ou campos de cobrança", () => {
    expect(sequelize.models).not.toHaveProperty("Campaign");
    expect(sequelize.models).not.toHaveProperty("AdBatch");
    expect(ServiceProvider.rawAttributes).not.toHaveProperty("subscriptionTier");
    expect(ServiceProvider.rawAttributes).not.toHaveProperty("subscriptionExpiresAt");
    expect(Negotiation.rawAttributes).not.toHaveProperty("escrowStatus");
  });

  it("cifra e decifra campos sensíveis", () => {
    const encrypted = encryptField("+258 84 123 4567");
    expect(encrypted).not.toContain("+258");
    expect(decryptField(encrypted)).toBe("+258 84 123 4567");
  });

  it("cifra phone e comprovativos nos hooks dos modelos Sequelize", async () => {
    const user = User.build({
      name: "Teste",
      email: "teste@example.local",
      phone: "+258 84 123 4567",
      role: "client",
      avatarUrl: null
    });
    await user.validate();
    expect(user.getDataValue("phone")).not.toContain("+258");
    expect(user.phone).toBe("+258 84 123 4567");

    const negotiation = Negotiation.build({
      clientId: "11111111-1111-4111-8111-111111111111",
      providerId: "22222222-2222-4222-8222-222222222222",
      serviceId: "33333333-3333-4333-8333-333333333333",
      status: "pending",
      agreedPrice: null,
      clientProofFile: "client/proof.jpg",
      providerProofFile: "provider/proof.jpg"
    });
    await negotiation.validate();
    expect(negotiation.getDataValue("clientProofFile")).not.toContain("client/");
    expect(negotiation.getDataValue("providerProofFile")).not.toContain("provider/");
    decryptModelField(negotiation, "clientProofFile");
    decryptModelField(negotiation, "providerProofFile");
    expect(negotiation.getDataValue("clientProofFile")).toBe("client/proof.jpg");
    expect(negotiation.getDataValue("providerProofFile")).toBe("provider/proof.jpg");
  });

  it("usa IV diferente por valor e mantém null/vazio", () => {
    const first = encryptField("comprovativo/path.png");
    const second = encryptField("comprovativo/path.png");
    expect(first).not.toBe(second);
    expect(encryptField(null)).toBeNull();
    expect(encryptField("")).toBe("");
  });

  it("rejeita chave mal configurada e valores adulterados", () => {
    process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString("base64");
    expect(() => encryptField("123")).toThrow("32 bytes");
    process.env.FIELD_ENCRYPTION_KEY = testKey;
    const encrypted = encryptField("123")!;
    expect(() => decryptField(`${encrypted.slice(0, -4)}AAAA`)).toThrow();
  });
});

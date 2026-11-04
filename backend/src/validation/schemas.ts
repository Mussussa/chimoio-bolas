import Joi from "joi";
import { isValidPrice } from "../domain/rules.js";

const requiredText = (label: string, max: number) =>
  Joi.string().trim().min(1).max(max).required().label(label);

const uuid = (label: string) => Joi.string().guid().required().label(label);
const price = (label: string, minimum = 0, maximum = 9_999_999_999.99) => {
  const schema = Joi.number().max(maximum).required().label(label);
  return minimum > 0 ? schema.greater(minimum) : schema.min(minimum);
};
const catalogPrice = (label: string, maximum = 9_999_999_999.99) =>
  Joi.number()
    .max(maximum)
    .required()
    .custom((value, helpers) => isValidPrice(value) ? value : helpers.error("number.currency"))
    .label(label);

export const validationMessages = {
  "any.required": "{#label} é obrigatório.",
  "any.only": "{#label} tem um valor inválido.",
  "array.base": "{#label} deve ser uma lista.",
  "array.max": "{#label} não pode ter mais de {#limit} itens.",
  "number.base": "{#label} deve ser um número válido.",
  "number.currency": "{#label} deve ser um valor monetário válido em MT.",
  "number.greater": "{#label} deve ser maior que {#limit}.",
  "number.integer": "{#label} deve ser um número inteiro.",
  "number.max": "{#label} não pode ser superior a {#limit}.",
  "number.min": "{#label} não pode ser inferior a {#limit}.",
  "number.positive": "{#label} deve ser maior que zero.",
  "object.base": "Os dados enviados devem estar num formato válido.",
  "object.unknown": "O campo {#label} não é permitido.",
  "string.base": "{#label} deve ser um texto.",
  "string.empty": "{#label} é obrigatório.",
  "string.guid": "{#label} tem um formato inválido.",
  "string.max": "{#label} não pode exceder {#limit} caracteres.",
  "string.min": "{#label} deve ter pelo menos {#limit} caracteres.",
  "string.pattern.base": "{#label} tem um formato inválido."
};

export const requestSchemas = {
  registerStore: Joi.object({
    name: requiredText("O nome da loja", 160),
    slug: Joi.string().trim().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180).required().label("O identificador da loja"),
    category: requiredText("A categoria", 100),
    description: requiredText("A descrição", 4000),
    address: requiredText("O endereço", 500),
    latitude: Joi.number().min(-90).max(90).required().label("A latitude"),
    longitude: Joi.number().min(-180).max(180).required().label("A longitude")
  }),
  createProduct: Joi.object({
    name: requiredText("O nome do produto", 160),
    description: requiredText("A descrição", 4000),
    price: catalogPrice("O preço"),
    category: requiredText("A categoria", 100),
    variants: Joi.array().default([]).label("As variantes"),
    images: Joi.array().items(Joi.string().max(2000).label("O endereço da imagem")).max(12).default([]).label("As imagens"),
    minOrderQty: Joi.number().integer().min(1).max(100_000).default(1).label("A quantidade mínima")
  }),
  updateProductPrice: Joi.object({
    price: catalogPrice("O preço", 1_000_000_000)
  }),
  registerProvider: Joi.object({
    category: requiredText("A categoria", 100),
    bio: requiredText("A biografia", 2000),
    basePrice: price("O preço base")
  }),
  publishService: Joi.object({
    title: requiredText("O título", 180),
    description: requiredText("A descrição", 5000),
    price: price("O preço"),
    deliveryTime: requiredText("O prazo de entrega", 100)
  }),
  updateProfile: Joi.object({
    name: requiredText("O nome", 120),
    phone: Joi.string().max(40).allow(null, "").optional().label("O telefone")
  }),
  createReview: Joi.object({
    targetType: Joi.string().valid("store", "service_provider").required().label("O tipo de destino"),
    targetId: uuid("O destino da avaliação"),
    rating: Joi.number().integer().min(1).max(5).required().label("A classificação"),
    comment: Joi.string().max(1000).allow("").default("").label("O comentário")
  }),
  createNegotiation: Joi.object({
    serviceId: uuid("O serviço")
  }),
  createMessage: Joi.object({
    content: requiredText("A mensagem", 4000),
    messageType: Joi.string().valid("text", "proposal").default("text").label("O tipo de mensagem"),
    proposalAmount: Joi.when("messageType", {
      is: "proposal",
      then: Joi.number()
        .max(9_999_999_999.99)
        .required()
        .custom((value, helpers) => isValidPrice(value) ? value : helpers.error("number.currency"))
        .label("O valor da proposta"),
      otherwise: Joi.number().optional().label("O valor da proposta")
    })
  }),
  respondToProposal: Joi.object({
    action: Joi.string().valid("accept", "reject").required().label("A resposta")
  }),
  storeIdParams: Joi.object({
    id: uuid("O identificador da loja")
  }),
  productIdParams: Joi.object({
    id: uuid("O identificador do produto")
  }),
  negotiationIdParams: Joi.object({
    id: uuid("O identificador da negociação")
  }),
  proposalParams: Joi.object({
    id: uuid("O identificador da negociação"),
    messageId: uuid("O identificador da proposta")
  })
};

import type { Sequelize } from "sequelize";
import { initializeAssociations } from "./associations.js";
import { initializeMessageModel } from "./Message.js";
import { initializeNegotiationModel } from "./Negotiation.js";
import { initializeProductModel } from "./Product.js";
import { initializeReviewModel } from "./Review.js";
import { initializeServiceModel } from "./Service.js";
import { initializeServiceProviderModel } from "./ServiceProvider.js";
import { initializeStoreModel } from "./Store.js";
import { initializeUserModel } from "./User.js";

export { Message } from "./Message.js";
export { Negotiation } from "./Negotiation.js";
export { Product } from "./Product.js";
export { Review } from "./Review.js";
export { Service } from "./Service.js";
export { ServiceProvider } from "./ServiceProvider.js";
export { Store } from "./Store.js";
export { User } from "./User.js";
export { decryptModelField, initializeEncryptedField } from "./encryptedFields.js";
export type { EncryptedModelField } from "./encryptedFields.js";
export type { MessageType, NegotiationStatus, UserRole } from "./types.js";

export function initializeModels(sequelize: Sequelize): void {
  initializeUserModel(sequelize);
  initializeStoreModel(sequelize);
  initializeProductModel(sequelize);
  initializeServiceProviderModel(sequelize);
  initializeServiceModel(sequelize);
  initializeNegotiationModel(sequelize);
  initializeMessageModel(sequelize);
  initializeReviewModel(sequelize);
  initializeAssociations();
}

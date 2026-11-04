import { Message } from "./Message.js";
import { Negotiation } from "./Negotiation.js";
import { Product } from "./Product.js";
import { Review } from "./Review.js";
import { Service } from "./Service.js";
import { ServiceProvider } from "./ServiceProvider.js";
import { Store } from "./Store.js";
import { User } from "./User.js";

export function initializeAssociations(): void {
  User.hasMany(Store, { foreignKey: "ownerId", as: "stores" });
  Store.belongsTo(User, { foreignKey: "ownerId", as: "owner" });
  Store.hasMany(Product, { foreignKey: "storeId", as: "products" });
  Product.belongsTo(Store, { foreignKey: "storeId", as: "store" });
  User.hasOne(ServiceProvider, { foreignKey: "userId", as: "serviceProvider" });
  ServiceProvider.belongsTo(User, { foreignKey: "userId", as: "user" });
  ServiceProvider.hasMany(Service, { foreignKey: "providerId", as: "services" });
  Service.belongsTo(ServiceProvider, { foreignKey: "providerId", as: "provider" });
  User.hasMany(Negotiation, { foreignKey: "clientId", as: "clientNegotiations" });
  Negotiation.belongsTo(User, { foreignKey: "clientId", as: "client" });
  ServiceProvider.hasMany(Negotiation, { foreignKey: "providerId", as: "negotiations" });
  Service.hasMany(Negotiation, { foreignKey: "serviceId", as: "negotiations" });
  Negotiation.belongsTo(ServiceProvider, { foreignKey: "providerId", as: "provider" });
  Negotiation.belongsTo(Service, { foreignKey: "serviceId", as: "service" });
  Negotiation.hasMany(Message, { foreignKey: "negotiationId", as: "messages" });
  Message.belongsTo(Negotiation, { foreignKey: "negotiationId", as: "negotiation" });
  User.hasMany(Message, { foreignKey: "senderId", as: "messages" });
  User.hasMany(Review, { foreignKey: "clientId", as: "reviews" });
  Review.belongsTo(User, { foreignKey: "clientId", as: "client" });
}

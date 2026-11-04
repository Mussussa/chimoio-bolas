import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type ModelStatic,
  type Sequelize
} from "sequelize";
import { decryptField, encryptField } from "../config/encryption.js";

export type UserRole = "client" | "lojista" | "prestador" | "admin";
export type SubscriptionTier = "basico" | "premium" | "empresarial";
export type TargetType = "store" | "product" | "service" | "custom";
export type PackageType = "standard" | "premium" | "basico" | "destaque";
export type NegotiationStatus = "pending" | "accepted" | "rejected" | "completed";
export type EscrowStatus = "inactive" | "active" | "disputed" | "completed";
export type MessageType = "text" | "proposal" | "system_alert";

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare phone: string | null;
  declare role: CreationOptional<UserRole>;
  declare avatarUrl: string | null;
  declare createdAt: CreationOptional<Date>;
}

export class Store extends Model<InferAttributes<Store>, InferCreationAttributes<Store>> {
  declare id: CreationOptional<string>;
  declare ownerId: string;
  declare name: string;
  declare slug: string;
  declare category: string;
  declare description: string;
  declare address: string;
  declare latitude: number;
  declare longitude: number;
  declare verified: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare name: string;
  declare description: string;
  declare price: string;
  declare category: string;
  declare variants: CreationOptional<Record<string, unknown>[]>;
  declare images: CreationOptional<string[]>;
  declare minOrderQty: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
}

export class ServiceProvider extends Model<InferAttributes<ServiceProvider>, InferCreationAttributes<ServiceProvider>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare category: string;
  declare bio: string;
  declare basePrice: string;
  declare subscriptionTier: CreationOptional<SubscriptionTier>;
  declare subscriptionStartedAt: Date;
  declare subscriptionExpiresAt: Date | null;
  declare verified: CreationOptional<boolean>;
  declare platformMember: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export class Service extends Model<InferAttributes<Service>, InferCreationAttributes<Service>> {
  declare id: CreationOptional<string>;
  declare providerId: string;
  declare title: string;
  declare description: string;
  declare price: string;
  declare deliveryTime: string;
  declare published: CreationOptional<boolean>;
  declare internalPlatformService: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export class Campaign extends Model<InferAttributes<Campaign>, InferCreationAttributes<Campaign>> {
  declare id: CreationOptional<string>;
  declare ownerId: string;
  declare targetType: TargetType;
  declare targetId: string | null;
  declare packageType: PackageType;
  declare cost: string;
  declare viewsInternal: CreationOptional<number>;
  declare viewsExternal: CreationOptional<number>;
  declare clicks: CreationOptional<number>;
  declare leads: CreationOptional<number>;
  declare status: CreationOptional<string>;
  declare adBatchId: string | null;
  declare createdAt: CreationOptional<Date>;
}

export class Negotiation extends Model<InferAttributes<Negotiation>, InferCreationAttributes<Negotiation>> {
  declare id: CreationOptional<string>;
  declare clientId: string;
  declare providerId: string;
  declare serviceId: string;
  declare status: CreationOptional<NegotiationStatus>;
  declare agreedPrice: string | null;
  declare escrowStatus: CreationOptional<EscrowStatus>;
  declare clientProofFile: string | null;
  declare providerProofFile: string | null;
  declare createdAt: CreationOptional<Date>;
}

export class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id: CreationOptional<string>;
  declare negotiationId: string;
  declare senderId: string;
  declare content: string;
  declare proposalAmount: string | null;
  declare messageType: MessageType;
  declare createdAt: CreationOptional<Date>;
}

export class Review extends Model<InferAttributes<Review>, InferCreationAttributes<Review>> {
  declare id: CreationOptional<string>;
  declare clientId: string;
  declare targetType: "store" | "service_provider";
  declare targetId: string;
  declare rating: number;
  declare comment: string;
  declare createdAt: CreationOptional<Date>;
}

export class AdBatch extends Model<InferAttributes<AdBatch>, InferCreationAttributes<AdBatch>> {
  declare id: CreationOptional<string>;
  declare planType: PackageType;
  declare totalRevenue: CreationOptional<string>;
  declare status: CreationOptional<string>;
  declare publishedToWeb: CreationOptional<boolean>;
  declare publishedToMeta: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
}

export function decryptModelField(instance: Model, field: "phone" | "clientProofFile" | "providerProofFile"): void {
  const value = instance.getDataValue(field) as string | null;
  if (value?.startsWith("enc:v1:")) instance.setDataValue(field, decryptField(value));
}

function initializeEncryptedField(model: ModelStatic<Model>, field: "phone" | "clientProofFile" | "providerProofFile"): void {
  model.addHook("beforeValidate", `encrypt-${field}`, (instance: Model) => {
    const value = instance.getDataValue(field) as string | null;
    if (value !== null && value !== "") instance.setDataValue(field, encryptField(value));
  });
  model.addHook("afterFind", `decrypt-${field}`, (result: Model | Model[] | null) => {
    const instances = Array.isArray(result) ? result : result ? [result] : [];
    for (const instance of instances) decryptModelField(instance, field);
  });
}

export function initializeModels(sequelize: Sequelize): void {
  const common = { sequelize, timestamps: true, underscored: true, createdAt: "createdAt", updatedAt: false };

  User.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    phone: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const stored = this.getDataValue("phone") as string | null;
        return stored?.startsWith("enc:v1:") ? decryptField(stored) : stored;
      }
    },
    role: { type: DataTypes.ENUM("client", "lojista", "prestador", "admin"), allowNull: false, defaultValue: "client" },
    avatarUrl: { type: DataTypes.TEXT, allowNull: true, field: "avatar_url" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "users" });
  initializeEncryptedField(User, "phone");

  Store.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    ownerId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "owner_id" },
    name: { type: DataTypes.STRING(160), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    category: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "stores" });

  Product.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    storeId: { type: DataTypes.UUID, allowNull: false, field: "store_id" },
    name: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    category: { type: DataTypes.STRING(100), allowNull: false },
    variants: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    images: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    minOrderQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: "min_order_qty" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "products" });

  ServiceProvider.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true, field: "user_id" },
    category: { type: DataTypes.STRING(100), allowNull: false },
    bio: { type: DataTypes.TEXT, allowNull: false },
    basePrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: "base_price" },
    subscriptionTier: { type: DataTypes.ENUM("basico", "premium", "empresarial"), allowNull: false, defaultValue: "basico", field: "subscription_tier" },
    subscriptionStartedAt: { type: DataTypes.DATE, allowNull: false, field: "subscription_started_at" },
    subscriptionExpiresAt: { type: DataTypes.DATE, allowNull: true, field: "subscription_expires_at" },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    platformMember: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "platform_member" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "service_providers" });

  Service.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    providerId: { type: DataTypes.UUID, allowNull: false, field: "provider_id" },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    deliveryTime: { type: DataTypes.STRING(100), allowNull: false, field: "delivery_time" },
    published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    internalPlatformService: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "internal_platform_service" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "services" });

  Campaign.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    ownerId: { type: DataTypes.UUID, allowNull: false, field: "owner_id" },
    targetType: { type: DataTypes.ENUM("store", "product", "service", "custom"), allowNull: false, field: "target_type" },
    targetId: { type: DataTypes.UUID, allowNull: true, field: "target_id" },
    packageType: { type: DataTypes.ENUM("standard", "premium", "basico", "destaque"), allowNull: false, field: "package_type" },
    cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    viewsInternal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "views_internal" },
    viewsExternal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "views_external" },
    clicks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    leads: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "queued" },
    adBatchId: { type: DataTypes.UUID, allowNull: true, field: "ad_batch_id" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "campaigns" });

  Negotiation.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    clientId: { type: DataTypes.UUID, allowNull: false, field: "client_id" },
    providerId: { type: DataTypes.UUID, allowNull: false, field: "provider_id" },
    serviceId: { type: DataTypes.UUID, allowNull: false, field: "service_id" },
    status: { type: DataTypes.ENUM("pending", "accepted", "rejected", "completed"), allowNull: false, defaultValue: "pending" },
    agreedPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "agreed_price" },
    escrowStatus: { type: DataTypes.ENUM("inactive", "active", "disputed", "completed"), allowNull: false, defaultValue: "inactive", field: "escrow_status" },
    clientProofFile: { type: DataTypes.TEXT, allowNull: true, field: "client_proof_file" },
    providerProofFile: { type: DataTypes.TEXT, allowNull: true, field: "provider_proof_file" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "negotiations" });
  initializeEncryptedField(Negotiation, "clientProofFile");
  initializeEncryptedField(Negotiation, "providerProofFile");

  Message.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    negotiationId: { type: DataTypes.UUID, allowNull: false, field: "negotiation_id" },
    senderId: { type: DataTypes.UUID, allowNull: false, field: "sender_id" },
    content: { type: DataTypes.TEXT, allowNull: false },
    proposalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "proposal_amount" },
    messageType: { type: DataTypes.ENUM("text", "proposal", "system_alert"), allowNull: false, defaultValue: "text", field: "message_type" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "messages" });

  Review.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    clientId: { type: DataTypes.UUID, allowNull: false, field: "client_id" },
    targetType: { type: DataTypes.ENUM("store", "service_provider"), allowNull: false, field: "target_type" },
    targetId: { type: DataTypes.UUID, allowNull: false, field: "target_id" },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    comment: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "reviews", indexes: [{ unique: true, fields: ["client_id", "target_type", "target_id"] }] });

  AdBatch.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    planType: { type: DataTypes.ENUM("standard", "premium", "basico", "destaque"), allowNull: false, field: "plan_type" },
    totalRevenue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: "total_revenue" },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "open" },
    publishedToWeb: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "published_to_web" },
    publishedToMeta: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "published_to_meta" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, { ...common, tableName: "ad_batches" });

  User.hasMany(Store, { foreignKey: "ownerId", as: "stores" });
  Store.belongsTo(User, { foreignKey: "ownerId", as: "owner" });
  Store.hasMany(Product, { foreignKey: "storeId", as: "products" });
  Product.belongsTo(Store, { foreignKey: "storeId", as: "store" });
  User.hasOne(ServiceProvider, { foreignKey: "userId", as: "serviceProvider" });
  ServiceProvider.belongsTo(User, { foreignKey: "userId", as: "user" });
  ServiceProvider.hasMany(Service, { foreignKey: "providerId", as: "services" });
  Service.belongsTo(ServiceProvider, { foreignKey: "providerId", as: "provider" });
  User.hasMany(Campaign, { foreignKey: "ownerId", as: "campaigns" });
  Campaign.belongsTo(User, { foreignKey: "ownerId", as: "owner" });
  Campaign.belongsTo(AdBatch, { foreignKey: "adBatchId", as: "batch" });
  AdBatch.hasMany(Campaign, { foreignKey: "adBatchId", as: "campaigns" });
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

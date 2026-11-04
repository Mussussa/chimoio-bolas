import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize
} from "sequelize";
import { initializeEncryptedField } from "./encryptedFields.js";
import { modelOptions } from "./modelOptions.js";
import type { NegotiationStatus } from "./types.js";

export class Negotiation extends Model<InferAttributes<Negotiation>, InferCreationAttributes<Negotiation>> {
  declare id: CreationOptional<string>;
  declare clientId: string;
  declare providerId: string;
  declare serviceId: string;
  declare status: CreationOptional<NegotiationStatus>;
  declare agreedPrice: string | null;
  declare clientProofFile: string | null;
  declare providerProofFile: string | null;
  declare createdAt: CreationOptional<Date>;
}

export function initializeNegotiationModel(sequelize: Sequelize): void {
  Negotiation.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    clientId: { type: DataTypes.UUID, allowNull: false, field: "client_id" },
    providerId: { type: DataTypes.UUID, allowNull: false, field: "provider_id" },
    serviceId: { type: DataTypes.UUID, allowNull: false, field: "service_id" },
    status: { type: DataTypes.ENUM("pending", "accepted", "rejected", "completed"), allowNull: false, defaultValue: "pending" },
    agreedPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "agreed_price" },
    clientProofFile: { type: DataTypes.TEXT, allowNull: true, field: "client_proof_file" },
    providerProofFile: { type: DataTypes.TEXT, allowNull: true, field: "provider_proof_file" },
    createdAt: { type: DataTypes.DATE, field: "created_at" }
  }, modelOptions(sequelize, "negotiations"));
  initializeEncryptedField(Negotiation, "clientProofFile");
  initializeEncryptedField(Negotiation, "providerProofFile");
}

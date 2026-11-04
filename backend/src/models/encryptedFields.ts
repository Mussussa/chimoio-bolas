import {
  Model,
  type ModelStatic
} from "sequelize";
import { decryptField, encryptField } from "../config/encryption.js";

export type EncryptedModelField = "phone" | "clientProofFile" | "providerProofFile";

export function decryptModelField(instance: Model, field: EncryptedModelField): void {
  const value = instance.getDataValue(field) as string | null;
  if (value?.startsWith("enc:v1:")) instance.setDataValue(field, decryptField(value));
}

export function initializeEncryptedField(model: ModelStatic<Model>, field: EncryptedModelField): void {
  model.addHook("beforeValidate", `encrypt-${field}`, (instance: Model) => {
    const value = instance.getDataValue(field) as string | null;
    if (value !== null && value !== "") instance.setDataValue(field, encryptField(value));
  });
  model.addHook("afterFind", `decrypt-${field}`, (result: Model | Model[] | null) => {
    const instances = Array.isArray(result) ? result : result ? [result] : [];
    for (const instance of instances) decryptModelField(instance, field);
  });
}

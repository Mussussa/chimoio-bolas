import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const prefix = "enc:v1:";

function ciphertextParts(value: string): [Buffer, Buffer, Buffer] | null {
  if (!value.startsWith(prefix)) return null;
  const [ivText, tagText, ciphertextText] = value.slice(prefix.length).split(":");
  if (!ivText || !tagText || ciphertextText === undefined) return null;
  const iv = Buffer.from(ivText, "base64");
  const tag = Buffer.from(tagText, "base64");
  const ciphertext = Buffer.from(ciphertextText, "base64");
  return iv.length === 12 && tag.length === 16 && ciphertext.length > 0 ? [iv, tag, ciphertext] : null;
}

function getEncryptionKey(): Buffer {
  const encoded = process.env.FIELD_ENCRYPTION_KEY;
  if (!encoded) throw new Error("FIELD_ENCRYPTION_KEY não está configurada.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY deve ser uma chave Base64 de 32 bytes.");
  return key;
}

export function assertEncryptionKey(): void {
  getEncryptionKey();
}

export function encryptField(value: string | null): string | null {
  if (value === null || value === "") return value;
  if (ciphertextParts(value)) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${prefix}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptField(value: string | null): string | null {
  if (value === null || value === "") return value;
  const parts = ciphertextParts(value);
  if (!parts) throw new Error("Campo cifrado inválido ou em formato não suportado.");
  const [iv, tag, ciphertext] = parts;
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

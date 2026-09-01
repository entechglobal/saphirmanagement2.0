import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

const getMasterKey = () => {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return Buffer.from(hex, "hex");
};

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns: "iv_hex:tag_hex:ciphertext_hex"
 */
export const encrypt = (plaintext) => {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
};

/**
 * Decrypt a string produced by encrypt().
 */
export const decrypt = (ciphertext) => {
  const key = getMasterKey();
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return (
    decipher.update(Buffer.from(encHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
};

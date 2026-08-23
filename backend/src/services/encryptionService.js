/* src/services/encryptionService.js
 *
 * AES-256-GCM encryption / decryption for Google OAuth refresh tokens.
 *
 * The GOOGLE_DRIVE_ENCRYPTION_KEY must be a 64-character hex string
 * (32 random bytes). Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Encrypted output format (colon-separated, base64 encoded):
 *   <iv_hex>:<authTag_hex>:<ciphertext_base64>
 *
 * SECURITY:
 * - A fresh random IV is generated for every encryption.
 * - The auth tag guarantees ciphertext integrity (tamper detection).
 * - The plaintext token is NEVER logged.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.GOOGLE_DRIVE_ENCRYPTION_KEY || "";

/**
 * Returns the 32-byte Buffer key, or throws if misconfigured.
 */
function getKey() {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error(
      "GOOGLE_DRIVE_ENCRYPTION_KEY must be a 64-character hex string. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(KEY_HEX, "hex");
}

/**
 * Encrypt a plaintext string (e.g. a refresh token).
 * Returns the encrypted string in the format: <iv_hex>:<authTag_hex>:<ciphertext_base64>
 */
export function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypt an encrypted string produced by encrypt().
 * Returns the original plaintext, or throws on failure.
 */
export function decrypt(encryptedString) {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextBase64] = encryptedString.split(":");

  if (!ivHex || !authTagHex || !ciphertextBase64) {
    throw new Error("Invalid encrypted token format.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

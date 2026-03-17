import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("TOKEN_ENCRYPTION_KEY must be at least 32 characters");
  }
}

/**
 * Encrypt a token for storage in the database
 * Tokens are NEVER exposed to the frontend
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) throw new Error("Cannot encrypt empty token");

  const iv = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY.substring(0, 32));

  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Combine IV + ciphertext, encode as base64
  const combined = iv.toString(CryptoJS.enc.Hex) + ":" + encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypt a stored token
 * Only used server-side for API calls
 */
export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) throw new Error("Cannot decrypt empty token");

  try {
    const combined = Buffer.from(encryptedToken, "base64").toString("utf8");
    const [ivHex, ciphertextHex] = combined.split(":");

    if (!ivHex || !ciphertextHex) throw new Error("Invalid token format");

    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY.substring(0, 32));
    const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    throw new Error("Failed to decrypt token - token may be corrupted");
  }
}

/**
 * Generate a secure random state token for OAuth
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Node.js fallback
    const nodeCrypto = require("crypto") as typeof import("crypto");
    const buf = nodeCrypto.randomBytes(32);
    buf.copy(Buffer.from(array.buffer));
  }
  return Buffer.from(array).toString("base64url");
}

/**
 * Hash sensitive data for logging (one-way)
 */
export function hashForLog(value: string): string {
  return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex).substring(0, 16);
}

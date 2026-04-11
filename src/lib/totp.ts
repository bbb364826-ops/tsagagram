import crypto from "crypto";

// TOTP (RFC 6238) implementation using Node built-in crypto
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32_CHARS[(buffer >> bitsLeft) & 31];
    }
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of clean) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c >>= 8;
  }
  const hmac = crypto.createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

export function generateTOTP(secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / 30);
  return hotp(secret, counter);
}

export function verifyTOTP(secret: string, token: string): boolean {
  const counter = Math.floor(Date.now() / 1000 / 30);
  // Accept current window ±1
  for (let i = -1; i <= 1; i++) {
    if (hotp(secret, counter + i) === token) return true;
  }
  return false;
}

export function getOtpAuthUri(secret: string, username: string): string {
  return `otpauth://totp/Tsagagram:${encodeURIComponent(username)}?secret=${secret}&issuer=Tsagagram&algorithm=SHA1&digits=6&period=30`;
}

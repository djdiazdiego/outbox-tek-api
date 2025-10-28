// Parses JSON safely. Returns undefined on null/undefined/empty string.
// Throws a clear error only when the input exists but is invalid JSON.
export function safeJsonParse<T = unknown>(
  raw: string | null | undefined
): T | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Invalid JSON in params");
  }
}

/**
 * Decodes Base64 (supports URL-safe variant and querystring '+'→' ' issue) into UTF-8 string.
 * - Accepts standard and URL-safe Base64.
 * - Fixes spaces that replaced '+' in query strings.
 * - Applies correct padding based on the *normalized* length.
 */
export function fromBase64(b64: string | undefined): string {
  if (!b64) throw new Error("Missing base64 payload");

  // Fix '+' turned into spaces by URL-decoding of query  strings
  const fixed = b64.replace(/ /g, "+");

  // Normalize URL-safe → standard Base64
  let normalized = fixed.replace(/-/g, "+").replace(/_/g, "/");

  // Apply proper padding based on normalized length
  const mod = normalized.length % 4;
  if (mod === 1) {
    // 1-mod lengths are invalid in proper Base64
    throw new Error("Invalid base64 length");
  } else if (mod === 2) {
    normalized += "==";
  } else if (mod === 3) {
    normalized += "=";
  }

  // Decode Base64 → binary string
  let bin: string;
  try {
    bin = atob(normalized);
  } catch {
    throw new Error("Invalid base64 payload");
  }

  // Binary string → Uint8Array
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  // UTF-8 decode
  return new TextDecoder("utf-8").decode(bytes);
}

/**
 * Encodes UTF-8 string into URL-safe Base64 (no padding).
 * NOTE: This returns URL-safe Base64. Consider renaming to `toBase64Url`.
 */
export function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  // Convert to URL-safe and strip padding
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

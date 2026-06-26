import crypto from "crypto";

// Duración de la sesión de administrador
const TTL_SECONDS = 8 * 60 * 60; // 8 horas

function getSecret(): string {
  // Se usa un secreto dedicado si existe; si no, se deriva de la contraseña maestra.
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

/** Genera un token de sesión firmado (HMAC) con expiración. */
export function createAdminToken(): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = String(exp);
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** Verifica que un token de sesión sea auténtico y no haya expirado. */
export function verifyAdminToken(token: string): boolean {
  try {
    const secret = getSecret();
    if (!secret) return false;
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const idx = decoded.indexOf(".");
    if (idx < 0) return false;
    const payload = decoded.slice(0, idx);
    const sig = decoded.slice(idx + 1);
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
    const exp = Number(payload);
    return Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/**
 * Autoriza una petición de administrador. Acepta un token de sesión válido
 * (preferido) o la contraseña maestra directa (compatibilidad / primer login).
 */
export function verifyAdminAuth(passcodeOrToken: string): boolean {
  if (!passcodeOrToken) return false;
  const masterPassword = process.env.ADMIN_PASSWORD;
  if (!masterPassword) return false;
  if (verifyAdminToken(passcodeOrToken)) return true;
  // Comparación de contraseña en tiempo constante para evitar timing attacks
  try {
    const a = Buffer.from(passcodeOrToken);
    const b = Buffer.from(masterPassword);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

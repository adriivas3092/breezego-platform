// Integración con la API REST real de Tilopay (https://app.tilopay.com/api/v1)
// Contrato verificado: login -> access_token; processPayment -> { url }.
import crypto from "crypto";

const TILOPAY_BASE = "https://app.tilopay.com/api/v1";

export function isTilopayConfigured(): boolean {
  return !!(process.env.TILOPAY_API_KEY && process.env.TILOPAY_API_USER && process.env.TILOPAY_API_PASSWORD);
}

/** Autentica contra Tilopay y devuelve un access_token (Bearer) o null. */
export async function tilopayLogin(): Promise<string | null> {
  const key = process.env.TILOPAY_API_KEY;
  const apiuser = process.env.TILOPAY_API_USER;
  const password = process.env.TILOPAY_API_PASSWORD;
  if (!key || !apiuser || !password) return null;

  const res = await fetch(`${TILOPAY_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiuser, password, key }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.access_token || null;
}

export interface TilopayBilling {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string; // ISO-2, p.ej. "CR"
  phone: string;
  email: string;
}

/**
 * Crea un pago en Tilopay y devuelve la URL de la página segura de pago.
 * `amount` en la moneda indicada (USD por defecto). `orderNumber` es nuestro id de orden.
 */
export async function tilopayProcessPayment(opts: {
  token: string;
  amount: number;
  currency?: string;
  orderNumber: string;
  redirect: string;
  billing: TilopayBilling;
}): Promise<{ url: string } | { error: string }> {
  const key = process.env.TILOPAY_API_KEY;
  const body = {
    redirect: opts.redirect,
    key,
    amount: opts.amount.toFixed(2),
    currency: opts.currency || "USD",
    orderNumber: opts.orderNumber,
    capture: "1",
    subscription: "0",
    platform: "api",
    hashVersion: "V2",
    billToFirstName: opts.billing.firstName,
    billToLastName: opts.billing.lastName,
    billToAddress: opts.billing.address,
    billToAddress2: opts.billing.address,
    billToCity: opts.billing.city,
    billToState: opts.billing.state,
    billToZipPostCode: opts.billing.zip,
    billToCountry: opts.billing.country,
    billToTelephone: opts.billing.phone,
    billToEmail: opts.billing.email,
  };

  const res = await fetch(`${TILOPAY_BASE}/processPayment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.token}` },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) {
    return { error: data?.message || `Tilopay processPayment status ${res.status}` };
  }
  return { url: data.url };
}

// Réplica de PHP number_format($n, 2): 2 decimales, '.' decimal, ',' miles.
function phpNumberFormat(n: number): string {
  const parts = Number(n).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/**
 * Verifica el OrderHash V2 del retorno de Tilopay (HMAC-SHA256).
 * Replica exactamente la fórmula del plugin oficial:
 *   key = `${tpt}|${api_key}|${api_password}`
 *   msg = http_build_query({api_Key, api_user, orderId(tpt), external_orden_id,
 *         amount(2 dec), currency, responseCode, auth, email}) en ese orden.
 */
interface OrderHashInput {
  tpt: string;
  order: string;
  code: string;
  auth: string;
  amount: number;
  currency: string;
  email: string;
}

/** Calcula el OrderHash V2 esperado (hex). Devuelve "" si faltan credenciales. */
export function computeTilopayOrderHash(p: OrderHashInput): string {
  const apiKey = process.env.TILOPAY_API_KEY;
  const apiUser = process.env.TILOPAY_API_USER;
  const apiPassword = process.env.TILOPAY_API_PASSWORD;
  if (!apiKey || !apiUser || !apiPassword) return "";

  const params = new URLSearchParams();
  params.append("api_Key", apiKey);
  params.append("api_user", apiUser);
  params.append("orderId", p.tpt);
  params.append("external_orden_id", p.order);
  params.append("amount", phpNumberFormat(p.amount));
  params.append("currency", p.currency);
  params.append("responseCode", p.code);
  params.append("auth", p.auth);
  params.append("email", p.email);

  const message = params.toString();
  const key = `${p.tpt}|${apiKey}|${apiPassword}`;
  return crypto.createHmac("sha256", key).update(message).digest("hex");
}

export function verifyTilopayOrderHash(p: OrderHashInput & { orderHash: string }): boolean {
  if (!p.orderHash) return false;
  const expected = computeTilopayOrderHash(p);
  if (!expected) return false;
  try {
    const a = Buffer.from(p.orderHash.toLowerCase());
    const b = Buffer.from(expected.toLowerCase());
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

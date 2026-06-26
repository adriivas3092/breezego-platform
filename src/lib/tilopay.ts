// Integración con la API REST real de Tilopay (https://app.tilopay.com/api/v1)
// Contrato verificado: login -> access_token; processPayment -> { url }.

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

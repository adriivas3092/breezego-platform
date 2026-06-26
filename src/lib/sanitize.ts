/**
 * Utilidades para sanitización y protección contra XSS e inyecciones de código.
 */

/**
 * Escapa los caracteres HTML especiales para evitar ejecuciones maliciosas de scripts (XSS).
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitiza recursivamente cualquier tipo de valor (string, array, objeto).
 */
export function sanitize<T>(val: T): T {
  if (typeof val === 'string') {
    return escapeHtml(val) as unknown as T;
  }
  
  if (Array.isArray(val)) {
    return val.map(item => sanitize(item)) as unknown as T;
  }
  
  if (val !== null && typeof val === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(val)) {
      sanitizedObj[key] = sanitize(value);
    }
    return sanitizedObj as unknown as T;
  }
  
  return val;
}

/**
 * Remueve caracteres sospechosos de inyección SQL rudimentaria (para logs o campos críticos).
 */
export function sanitizeSqlPattern(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/['";\-]/g, '');
}

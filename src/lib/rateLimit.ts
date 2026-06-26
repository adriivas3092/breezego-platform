/**
 * Utilidad de Rate Limiting compatible con Edge y Serverless.
 * Si están configuradas las variables de Upstash Redis en producción, usa Redis vía REST.
 * De lo contrario, cae en un fallback local en memoria RAM (Map) optimizado para desarrollo.
 */

import { logger } from './logger';

// Fallback local en memoria
interface RateLimitRecord {
  count: number;
  resetTime: number; // timestamp en segundos
}

const localCache = new Map<string, RateLimitRecord>();

// Limpieza periódica cada 5 minutos en entornos que persistan el estado en memoria
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    for (const [key, record] of localCache.entries()) {
      if (record.resetTime < now) {
        localCache.delete(key);
      }
    }
  }, 300000); // 5 minutos
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // timestamp de reinicio en segundos
}

/**
 * Verifica si una clave excede el límite de solicitudes.
 * 
 * @param key Identificador único (ej: `ip:api:login`, `user:123:global`)
 * @param limit Número máximo de requests permitidos
 * @param windowSeconds Duración de la ventana de tiempo en segundos
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const cacheKey = `ratelimit:${key}`;

  // 1. Uso de Upstash Redis en Producción (Edge-safe, sin TCP persistente)
  if (redisUrl && redisToken) {
    try {
      const cleanedUrl = redisUrl.replace(/\/$/, '');
      const response = await fetch(`${cleanedUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', cacheKey],
          ['TTL', cacheKey],
        ]),
      });

      if (!response.ok) {
        throw new Error(`Upstash API retornó status ${response.status}`);
      }

      const data = await response.json();
      
      // Parsear respuesta del pipeline. El pipeline retorna un array de respuestas, ej:
      // [{ result: 1 }, { result: 59 }] o [1, 59]
      const countResult = data[0]?.result !== undefined ? data[0].result : data[0];
      const ttlResult = data[1]?.result !== undefined ? data[1].result : data[1];

      const currentCount = typeof countResult === 'number' ? countResult : parseInt(String(countResult), 10);
      const ttl = typeof ttlResult === 'number' ? ttlResult : parseInt(String(ttlResult), 10);

      // Si es el primer request de la ventana, le asignamos el tiempo de expiración
      if (currentCount === 1 || ttl < 0) {
        await fetch(`${cleanedUrl}/expire`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${redisToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([cacheKey, windowSeconds]),
        });
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const resetTime = nowSeconds + (ttl > 0 ? ttl : windowSeconds);
      const remaining = Math.max(0, limit - currentCount);

      const success = currentCount <= limit;

      if (!success) {
        logger.warn('Rate limit excedido (Redis)', {
          ip: key,
          metadata: { limit, remaining, resetTime },
        });
      }

      return {
        success,
        limit,
        remaining,
        reset: resetTime,
      };
    } catch (error) {
      logger.error('Error en Rate Limit Redis, cayendo en fallback local', error);
      // Fallback a memoria local en caso de error en Redis
    }
  }

  // 2. Persistencia en Postgres (Supabase) vía RPC con service role.
  // Es consistente entre instancias serverless, a diferencia del Map en memoria.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey && serviceRoleKey !== 'undefined') {
    try {
      const resp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/check_rate_limit`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_key: cacheKey, p_limit: limit, p_window: windowSeconds }),
      });
      if (!resp.ok) throw new Error(`Supabase RPC retornó status ${resp.status}`);
      const rows = await resp.json();
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row) {
        const success = !!row.allowed;
        if (!success) {
          logger.warn('Rate limit excedido (Postgres)', {
            ip: key,
            metadata: { limit, remaining: row.remaining, reset: row.reset_seconds },
          });
        }
        return {
          success,
          limit,
          remaining: Number(row.remaining ?? 0),
          reset: Number(row.reset_seconds ?? Math.floor(Date.now() / 1000) + windowSeconds),
        };
      }
    } catch (error) {
      logger.error('Error en Rate Limit Postgres, cayendo en fallback local', error);
      // Continúa al fallback en memoria
    }
  }

  // 3. Fallback Local en Memoria RAM (último recurso)
  const now = Math.floor(Date.now() / 1000);
  let record = localCache.get(cacheKey);

  if (!record || record.resetTime < now) {
    // Inicializar o reiniciar la ventana
    record = {
      count: 1,
      resetTime: now + windowSeconds,
    };
    localCache.set(cacheKey, record);
  } else {
    // Incrementar dentro de la ventana activa
    record.count += 1;
  }

  const remaining = Math.max(0, limit - record.count);
  const success = record.count <= limit;

  if (!success) {
    logger.warn('Rate limit excedido (Local Memory)', {
      ip: key,
      metadata: { limit, remaining, reset: record.resetTime },
    });
  }

  return {
    success,
    limit,
    remaining,
    reset: record.resetTime,
  };
}

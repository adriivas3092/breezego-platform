/**
 * Logger estructurado para auditoría y monitoreo.
 * Formatea todos los mensajes como JSON válido para facilitar la ingesta
 * por sistemas como Vercel Logs, Sentry, Datadog o Logflare.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
}

class StructuredLogger {
  private log(level: LogLevel, message: string, options: Partial<Omit<LogPayload, 'timestamp' | 'level' | 'message'>> = {}) {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: options.context,
      userId: options.userId,
      ip: options.ip,
      userAgent: options.userAgent,
      metadata: options.metadata,
    };

    if (options.error) {
      payload.error = {
        message: options.error.message,
        stack: options.error.stack,
        code: (options.error as any).code || undefined,
        details: (options.error as any).details || undefined,
        hint: (options.error as any).hint || undefined,
      };
    }

    const jsonString = JSON.stringify(payload);

    // En Vercel / Cloud Functions, console.log/console.error captura la salida
    // de forma asíncrona sin bloquear el loop de ejecución.
    if (level === 'ERROR') {
      console.error(jsonString);
      // Aquí se integraría la llamada directa a Sentry en producción si está configurado:
      // if (process.env.SENTRY_DSN) { Sentry.captureException(options.error || message); }
    } else if (level === 'WARN') {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }
  }

  info(message: string, options: Partial<Omit<LogPayload, 'timestamp' | 'level' | 'message'>> = {}) {
    this.log('INFO', message, options);
  }

  warn(message: string, options: Partial<Omit<LogPayload, 'timestamp' | 'level' | 'message'>> = {}) {
    this.log('WARN', message, options);
  }

  error(message: string, err?: any, options: Partial<Omit<LogPayload, 'timestamp' | 'level' | 'message'>> = {}) {
    this.log('ERROR', message, {
      ...options,
      error: this.normalizeError(err),
    });
  }

  /**
   * Normaliza cualquier valor de error a { message, stack, code, details, hint }.
   * Importante: los errores de Supabase/PostgREST son objetos planos (no Error),
   * así que String(err) daría "[object Object]" y se perdería la causa real.
   */
  private normalizeError(err: any): LogPayload['error'] | undefined {
    if (!err) return undefined;
    if (err instanceof Error) {
      return { message: err.message, stack: err.stack, code: (err as any).code };
    }
    if (typeof err === 'object') {
      const msg = err.message || err.error_description || err.error || err.msg;
      return {
        message: typeof msg === 'string' && msg ? msg : JSON.stringify(err),
        code: err.code,
        details: err.details,
        hint: err.hint,
      };
    }
    return { message: String(err) };
  }

  debug(message: string, options: Partial<Omit<LogPayload, 'timestamp' | 'level' | 'message'>> = {}) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('DEBUG', message, options);
    }
  }
}

export const logger = new StructuredLogger();

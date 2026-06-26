/**
 * Utilidad de integración con Cloudflare Turnstile.
 * Permite validar tokens de CAPTCHA inteligente del lado del servidor.
 */

import { logger } from './logger';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export const IS_TURNSTILE_ENABLED = false; // Toggle para habilitar/deshabilitar CAPTCHA

/**
 * Valida el token de Cloudflare Turnstile en el backend.
 * 
 * @param token El token recibido del frontend
 * @param ip Dirección IP del cliente
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  if (!IS_TURNSTILE_ENABLED) {
    return true;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x00000000000000000000000000000000AA'; // Test secret key fallback
  
  if (!token) {
    logger.warn('Validación de Turnstile falló: Token no suministrado');
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Cloudflare Turnstile API retornó status ${response.status}`);
    }

    const data = (await response.json()) as TurnstileResponse;

    if (!data.success) {
      logger.warn('Token de Turnstile inválido o rechazado', {
        ip,
        metadata: { errorCodes: data['error-codes'] },
      });
      return false;
    }

    logger.debug('Token de Turnstile verificado exitosamente', { ip });
    return true;
  } catch (error) {
    logger.error('Error al verificar token de Turnstile con Cloudflare', error, { ip });
    // En caso de que falle el servicio de Cloudflare por caídas de red,
    // en desarrollo lo permitimos, pero en producción deberíamos evaluar
    // si deseamos bloquear o dejar pasar bajo auditoría.
    return process.env.NODE_ENV !== 'production';
  }
}

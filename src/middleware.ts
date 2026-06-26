import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from './lib/rateLimit';
import { logger } from './lib/logger';

// Regex para detectar bots, scrapers y librerías de automatización comunes
const BOT_UA_REGEX = /bot|crawler|spider|scraper|headless|curl|wget|python|scrapy|puppeteer|playwright|selenium|axios|got|superagent|http-client/i;

// Extensiones de archivos comunes a ignorar para el middleware
const STATIC_EXTENSIONS = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.json'];

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
    return true;
  }
  return STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Decodificar base64url compatible con el Edge Runtime
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    const parsed = JSON.parse(jsonPayload);
    return parsed.sub || null;
  } catch (e) {
    return null;
  }
}

function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ip = xForwardedFor.split(',')[0].trim();
    if (ip) return ip;
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp;
  return request.ip || '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // 1. Omitir recursos estáticos y webhooks de la pasarela de pagos
  if (isStaticAsset(pathname) || pathname.startsWith('/api/payments/tilopay/webhook')) {
    return NextResponse.next();
  }

  // 2. PROTECCIÓN DE BOTS (User-Agent sospechosos y scrapers)
  if (BOT_UA_REGEX.test(userAgent)) {
    // Permitir motores de búsqueda oficiales (Google, Bing) solo en landing pages estáticas,
    // bloquearlos en endpoints de API o rutas privadas.
    const isSearchEngine = /googlebot|bingbot|yandexbot|baiduspider/i.test(userAgent);
    const isApiOrAuth = pathname.startsWith('/api') || pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

    if (!isSearchEngine || isApiOrAuth) {
      logger.warn('Acceso bloqueado por sospecha de Bot/Crawler', {
        ip,
        userAgent,
        context: 'bot-protection',
        metadata: { path: pathname },
      });

      return new NextResponse(
        JSON.stringify({ success: false, error: 'Acceso denegado. Cliente automatizado detectado.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 3. IDENTIFICAR USUARIO (Autenticado vs Anónimo)
  // Intentar leer token JWT de la cookie o el header Authorization
  let sessionToken = request.cookies.get('bz_auth_session')?.value || '';
  if (!sessionToken) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.replace('Bearer ', '');
    }
  }

  const userId = sessionToken ? decodeJwtSub(sessionToken) : null;

  // 4. RATE LIMITING DE RUTAS PÚBLICAS Y ESPECÍFICAS
  // A. Registro (máx 5 registros por hora por IP)
  if (pathname === '/api/auth/signup') {
    const signupLimit = await checkRateLimit(`ip:${ip}:signup`, 5, 3600); // 1 hora
    if (!signupLimit.success) {
      logger.warn('Límite de registro de cuenta excedido', { ip, userAgent, context: 'rate-limit-signup' });
      return NextResponse.json(
        { success: false, error: 'Demasiadas solicitudes de registro. Máximo 5 registros por hora.' },
        {
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(signupLimit.reset),
          },
        }
      );
    }
  }

  // B. Recuperación de contraseña (máx 3 solicitudes cada 30 minutos por IP)
  if (pathname === '/api/auth/recover') {
    const recoverLimit = await checkRateLimit(`ip:${ip}:recover`, 3, 1800); // 30 minutos
    if (!recoverLimit.success) {
      logger.warn('Límite de recuperación de contraseña excedido', { ip, userAgent, context: 'rate-limit-recover' });
      return NextResponse.json(
        { success: false, error: 'Demasiadas solicitudes de recuperación. Máximo 3 solicitudes cada 30 minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': '1800',
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(recoverLimit.reset),
          },
        }
      );
    }
  }

  // 5. RATE LIMITING GLOBAL
  let globalLimit;
  if (userId) {
    // Autenticado: Máximo 500 requests por minuto por usuario
    globalLimit = await checkRateLimit(`user:${userId}:global`, 500, 60);
  } else {
    // Anónimo: Máximo 100 requests por minuto por IP
    globalLimit = await checkRateLimit(`ip:${ip}:global`, 100, 60);
  }

  if (!globalLimit.success) {
    logger.warn('Límite de solicitudes global excedido', {
      ip,
      userId: userId || undefined,
      userAgent,
      context: 'rate-limit-global',
      metadata: { path: pathname, isAuthed: !!userId },
    });

    return NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes. Por favor, intente de nuevo en un minuto.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': userId ? '500' : '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(globalLimit.reset),
        },
      }
    );
  }

  // 6. REDIRECCIONAMIENTO Y AUTENTICACIÓN (Rutas Protegidas)
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/packages') || 
                           pathname.startsWith('/prealerts') ||
                           pathname.startsWith('/mailbox') ||
                           pathname.startsWith('/notifications') ||
                           pathname.startsWith('/admin');

  // Las rutas /admin tienen su propio gate de contraseña en el cliente, por eso
  // se excluyen aquí (de lo contrario el administrador sería redirigido a /login).
  if (isProtectedRoute && !pathname.startsWith('/admin') && !sessionToken) {
    // Redirigir a login si el usuario no tiene sesión activa
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Agregar headers útiles
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', userId ? '500' : '100');
  response.headers.set('X-RateLimit-Remaining', String(globalLimit.remaining));
  response.headers.set('X-RateLimit-Reset', String(globalLimit.reset));

  return response;
}

export const config = {
  matcher: [
    /*
     * Interceptar todas las solicitudes excepto:
     * - api/payments/tilopay/webhook (exclusión explícita)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (icono del sitio)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/payments/tilopay/webhook).*)',
  ],
};

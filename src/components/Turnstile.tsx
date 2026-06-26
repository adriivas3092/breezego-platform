"use client";

import React, { useEffect, useRef } from 'react';
import { IS_TURNSTILE_ENABLED } from '@/lib/turnstile';

interface TurnstileProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export const Turnstile: React.FC<TurnstileProps> = ({
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA', // Test site key fallback
  onVerify,
  onError,
  onExpire,
  theme = 'dark',
  size = 'normal',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  if (!IS_TURNSTILE_ENABLED) {
    return null;
  }

  useEffect(() => {
    // 1. Evitar renderizar en el servidor
    if (typeof window === 'undefined') return;

    let isMounted = true;
    const scriptId = 'cloudflare-turnstile-script';

    const initializeTurnstile = () => {
      if (!window.turnstile || !containerRef.current || !isMounted) return;

      try {
        // Remover widget previo si existe
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        // Renderizar de forma explícita el widget de Cloudflare Turnstile
        const widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) onVerify(token);
          },
          'error-callback': () => {
            if (isMounted && onError) onError();
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
          theme,
          size,
        });

        widgetIdRef.current = widgetId;
      } catch (err) {
        console.error('Error rendering Cloudflare Turnstile:', err);
      }
    };

    // 2. Cargar script dinámicamente si no existe
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
      script.async = true;
      script.defer = true;
      
      // Callback global invocado por Turnstile al cargarse
      window.onloadTurnstileCallback = () => {
        if (isMounted) initializeTurnstile();
      };

      document.body.appendChild(script);
    } else {
      // Si el script ya está en el DOM, inicializar directamente o esperar al callback
      if (window.turnstile) {
        initializeTurnstile();
      } else {
        const prevCallback = window.onloadTurnstileCallback;
        window.onloadTurnstileCallback = () => {
          if (prevCallback) prevCallback();
          if (isMounted) initializeTurnstile();
        };
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (err) {
          // Capturar errores en desmontado rápido
        }
      }
    };
  }, [siteKey, onVerify, onError, onExpire, theme, size]);

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center my-4 overflow-hidden rounded-lg min-h-[65px] transition-all duration-300" 
      style={{ contentVisibility: 'auto' }}
    />
  );
};

/**
 * BreezeGo Premium Cookie Consent Banner component
 * Inspired by Stripe & Shopify - Modern, minimal, and non-intrusive.
 */
(function() {
    // Check if the user has already decided
    if (sessionStorage.getItem('BZ_COOKIE_CONSENT_DECIDED') === 'true') {
        return;
    }

    // Dynamic stylesheet injection for zero-dependency modularity
    const css = `
        .bz-cookie-banner {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: calc(100% - 48px);
            max-width: 420px;
            background: rgba(29, 42, 62, 0.95); /* Deep Brand Navy base */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 30px rgba(70, 199, 210, 0.05);
            border-radius: 16px;
            padding: 24px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 16px;
            animation: bzFadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            font-family: 'Inter', sans-serif;
            color: #ffffff;
        }

        @keyframes bzFadeInUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .bz-cookie-header {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .bz-cookie-icon {
            font-size: 1.5rem;
            animation: bzSpin 10s linear infinite;
        }

        @keyframes bzSpin {
            100% { transform: rotate(360deg); }
        }

        .bz-cookie-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            color: #46C7D2; /* Brand Cyan */
            letter-spacing: -0.5px;
        }

        .bz-cookie-text {
            font-size: 0.88rem;
            line-height: 1.5;
            color: #cbd5e1;
            margin: 0;
        }

        .bz-cookie-text a {
            color: #46C7D2;
            text-decoration: underline;
            font-weight: 500;
        }

        .bz-cookie-text a:hover {
            color: #0C8096;
        }

        .bz-cookie-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            flex-wrap: wrap;
        }

        .bz-cookie-btn {
            font-family: 'Montserrat', sans-serif;
            font-size: 0.82rem;
            font-weight: 600;
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.2s ease;
            outline: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .bz-cookie-btn-primary {
            background: linear-gradient(135deg, #46C7D2 0%, #0C8096 100%);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(70, 199, 210, 0.2);
        }

        .bz-cookie-btn-primary:hover {
            box-shadow: 0 6px 14px rgba(70, 199, 210, 0.3);
            transform: translateY(-1px);
        }

        .bz-cookie-btn-secondary {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.1);
            color: #ffffff;
        }

        .bz-cookie-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .bz-cookie-btn-ghost {
            background: transparent;
            color: #94a3b8;
            padding-left: 8px;
            padding-right: 8px;
        }

        .bz-cookie-btn-ghost:hover {
            color: #ef4444;
        }

        @media (max-width: 500px) {
            .bz-cookie-banner {
                bottom: 12px;
                left: 12px;
                width: calc(100% - 24px);
                max-width: none;
                border-radius: 12px;
                padding: 18px;
            }
            .bz-cookie-actions {
                justify-content: stretch;
            }
            .bz-cookie-actions button {
                flex: 1 1 45%;
            }
            .bz-cookie-btn-ghost {
                flex: 1 1 100% !important;
                order: 3;
                text-align: center;
            }
        }
    `;

    // Inject CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = css;
    document.head.appendChild(styleElement);

    // Create Markup
    const banner = document.createElement('div');
    banner.className = 'bz-cookie-banner';
    banner.id = 'bz-cookie-banner-card';
    banner.innerHTML = `
        <div class="bz-cookie-header">
            <span class="bz-cookie-icon">🍪</span>
            <span class="bz-cookie-title">Preferencias de Privacidad</span>
        </div>
        <p class="bz-cookie-text">
            Utilizamos cookies de analítica (Google Analytics) y marketing (Meta Pixel) para optimizar el rendimiento y envío de tu casillero en Miami. Lee nuestra <a href="cookies.html" target="_blank">Política de Cookies</a>.
        </p>
        <div class="bz-cookie-actions">
            <button class="bz-cookie-btn bz-cookie-btn-ghost" id="bz-cookie-reject">Rechazar todo</button>
            <button class="bz-cookie-btn bz-cookie-btn-secondary" id="bz-cookie-customize">Personalizar</button>
            <button class="bz-cookie-btn bz-cookie-btn-primary" id="bz-cookie-accept">Aceptar todo</button>
        </div>
    `;

    // Append to body
    document.body.appendChild(banner);

    // Event Listeners
    const btnAccept = document.getElementById('bz-cookie-accept');
    const btnReject = document.getElementById('bz-cookie-reject');
    const btnCustomize = document.getElementById('bz-cookie-customize');

    const dismissBanner = () => {
        banner.style.animation = 'bzFadeOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => {
            banner.remove();
        }, 400);
    };

    // Inject fadeOut animation rules dynamically in same style block if needed
    const styleSheet = document.styleSheets[document.styleSheets.length - 1];
    styleSheet.insertRule(`
        @keyframes bzFadeOut {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(20px) scale(0.95); }
        }
    `, styleSheet.cssRules.length);

    btnAccept.addEventListener('click', () => {
        sessionStorage.setItem('BZ_COOKIE_CONSENT_DECIDED', 'true');
        localStorage.setItem('BZ_COOKIE_PREF_ANALYTICS', 'true');
        localStorage.setItem('BZ_COOKIE_PREF_MARKETING', 'true');
        dismissBanner();
    });

    btnReject.addEventListener('click', () => {
        sessionStorage.setItem('BZ_COOKIE_CONSENT_DECIDED', 'true');
        localStorage.setItem('BZ_COOKIE_PREF_ANALYTICS', 'false');
        localStorage.setItem('BZ_COOKIE_PREF_MARKETING', 'false');
        dismissBanner();
    });

    btnCustomize.addEventListener('click', () => {
        // Redirect to cookie preferences panel directly
        window.open('cookies.html#preferencias', '_blank');
        dismissBanner();
    });

})();

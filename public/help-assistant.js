/**
 * BreezeGo Premium Interactive Help Assistant
 * Inspired by Intercom Help Center, Stripe Support Widget, and Linear Help UX.
 * Fully modular, zero-dependency component that injects its own markup and styles.
 * Based on predefined answers, guided help flows, and searchable resource cards (NOT an AI chatbot).
 */
(function() {
    // 1. DYNAMIC STYLESHEET INJECTION (Premium Space Navy Glassmorphism)
    const css = `
        /* Floating Help Action Button */
        .bz-help-trigger {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #46C7D2 0%, #0c8096 100%);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 10px 25px rgba(70, 199, 210, 0.4), 0 0 15px rgba(70, 199, 210, 0.2);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            outline: none;
        }

        .bz-help-trigger:hover {
            transform: scale(1.08) translateY(-2px);
            box-shadow: 0 14px 30px rgba(70, 199, 210, 0.5), 0 0 25px rgba(70, 199, 210, 0.3);
            animation: bzHeartbeat 1s infinite alternate;
        }

        @keyframes bzHeartbeat {
            0% { transform: scale(1.08) translateY(-2px); }
            100% { transform: scale(1.14) translateY(-3px); }
        }

        .bz-help-trigger:active {
            transform: scale(0.95);
        }

        .bz-help-icon-svg {
            width: 26px;
            height: 26px;
            fill: currentColor;
            transition: transform 0.4s ease;
        }

        .bz-help-trigger.open .bz-help-icon-svg {
            transform: rotate(135deg);
        }

        /* Pulsing Dot Indicator */
        .bz-help-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            width: 14px;
            height: 14px;
            background: #FC7C58; /* Brand Orange */
            border-radius: 50%;
            border: 2px solid #ffffff;
            animation: bzPulseOrange 2s infinite;
        }

        @keyframes bzPulseOrange {
            0% { box-shadow: 0 0 0 0 rgba(252, 124, 88, 0.7); }
            70% { box-shadow: 0 0 0 8px rgba(252, 124, 88, 0); }
            100% { box-shadow: 0 0 0 0 rgba(252, 124, 88, 0); }
        }

        /* Help Panel Container */
        .bz-help-panel {
            position: fixed;
            bottom: 96px;
            right: 24px;
            width: 400px;
            height: 600px;
            max-height: calc(100vh - 120px);
            background: rgba(29, 42, 62, 0.97); /* Deep Brand Navy */
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 30px rgba(70, 199, 210, 0.05);
            border-radius: 20px;
            z-index: 9998;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            color: #ffffff;
            font-family: 'Inter', sans-serif;
        }

        .bz-help-panel.open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }

        /* 1. Header with Search Center */
        .bz-help-header {
            background: rgba(12, 128, 150, 0.2);
            padding: 24px 20px 20px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .bz-help-header-top {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .bz-help-logo {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: linear-gradient(135deg, #46C7D2 0%, #0c8096 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            box-shadow: 0 4px 10px rgba(70, 199, 210, 0.3);
        }

        .bz-help-header-title-wrap {
            display: flex;
            flex-direction: column;
        }

        .bz-help-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.05rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.3px;
            margin: 0;
        }

        .bz-help-subtitle {
            font-size: 0.72rem;
            color: #94a3b8;
            margin-top: 1px;
        }

        /* Search input bar */
        .bz-help-search-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .bz-help-search-icon {
            position: absolute;
            left: 14px;
            color: #94a3b8;
            width: 16px;
            height: 16px;
            pointer-events: none;
        }

        .bz-help-search-input {
            width: 100%;
            height: 42px;
            background: rgba(11, 17, 26, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 0 16px 0 42px;
            color: #ffffff;
            font-size: 0.88rem;
            outline: none;
            transition: all 0.2s;
            font-family: 'Inter', sans-serif;
        }

        .bz-help-search-input:focus {
            border-color: rgba(70, 199, 210, 0.4);
            box-shadow: 0 0 0 3px rgba(70, 199, 210, 0.15);
        }

        /* 2. Scrollable Body Views with transitions */
        .bz-help-body {
            flex: 1;
            overflow-y: auto;
            position: relative;
        }

        .bz-help-view {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            width: 100%;
            box-sizing: border-box;
        }

        .bz-help-view-detail {
            position: absolute;
            top: 0;
            left: 100%;
            opacity: 0;
            pointer-events: none;
        }

        .bz-help-view-detail.active {
            left: 0;
            opacity: 1;
            pointer-events: auto;
            position: relative;
        }

        .bz-help-view-home.inactive {
            transform: translateX(-30%);
            opacity: 0;
            pointer-events: none;
            position: absolute;
        }

        /* 3. Home View Sections */
        .bz-section-heading {
            font-family: 'Montserrat', sans-serif;
            font-size: 0.78rem;
            font-weight: 700;
            color: #46C7D2;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 10px;
        }

        /* Suggested actions index */
        .bz-suggested-index {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .bz-index-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 14px 16px;
            color: #f1f5f9;
            font-size: 0.88rem;
            font-weight: 500;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .bz-index-item:hover {
            background: rgba(70, 199, 210, 0.06);
            border-color: rgba(70, 199, 210, 0.15);
            color: #46C7D2;
            transform: translateY(-1px);
        }

        .bz-index-icon {
            font-size: 1.1rem;
            margin-right: 12px;
        }

        .bz-index-text {
            flex: 1;
        }

        .bz-index-arrow {
            font-size: 0.8rem;
            color: #94a3b8;
            transition: transform 0.2s;
        }

        .bz-index-item:hover .bz-index-arrow {
            color: #46C7D2;
            transform: translateX(3px);
        }

        /* FAQ Categories Grid */
        .bz-categories-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .bz-category-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .bz-category-card:hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.08);
            transform: translateY(-2px);
        }

        .bz-cat-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .bz-cat-icon {
            font-size: 1.5rem;
        }

        .bz-cat-count {
            background: rgba(255, 255, 255, 0.05);
            color: #94a3b8;
            font-size: 0.65rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
        }

        .bz-cat-name {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 0.85rem;
            color: #ffffff;
            margin-top: 4px;
        }

        .bz-cat-desc {
            font-size: 0.72rem;
            color: #cbd5e1;
            line-height: 1.3;
        }

        /* Onboarding guide / Quick tips empty state section */
        .bz-onboarding-tips {
            background: rgba(70, 199, 210, 0.04);
            border: 1px solid rgba(70, 199, 210, 0.1);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .bz-tips-lightbulb {
            font-size: 1.4rem;
            animation: bzGlow 2s infinite alternate;
        }

        @keyframes bzGlow {
            0% { text-shadow: 0 0 2px rgba(70,199,210,0); }
            100% { text-shadow: 0 0 8px rgba(70,199,210,0.8); }
        }

        .bz-tips-content {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .bz-tips-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 0.8rem;
            font-weight: 700;
            color: #46C7D2;
        }

        .bz-tips-text {
            font-size: 0.78rem;
            color: #cbd5e1;
            line-height: 1.4;
            margin: 0;
        }

        /* 4. Detail / Article View Components */
        .bz-detail-back-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #94a3b8;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            align-self: flex-start;
            transition: color 0.2s;
            margin-bottom: 4px;
        }

        .bz-detail-back-bar:hover {
            color: #46C7D2;
        }

        .bz-detail-header {
            display: flex;
            flex-direction: column;
            gap: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            padding-bottom: 16px;
        }

        .bz-article-category {
            font-family: 'Montserrat', sans-serif;
            font-size: 0.75rem;
            font-weight: 700;
            color: #46C7D2;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .bz-article-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.15rem;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.3;
            margin: 0;
        }

        .bz-article-content {
            font-size: 0.88rem;
            line-height: 1.5;
            color: #cbd5e1;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        /* Steps Card */
        .bz-steps-card {
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .bz-step-row {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .bz-step-num {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #46C7D2;
            color: #111;
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 0.78rem;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 0 10px rgba(70, 199, 210, 0.3);
        }

        .bz-step-text {
            font-size: 0.82rem;
            color: #cbd5e1;
            line-height: 1.4;
            margin: 0;
        }

        .bz-step-text strong {
            color: #ffffff;
        }

        /* Actions CTA bar */
        .bz-article-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 12px;
        }

        .bz-article-btn {
            background: linear-gradient(135deg, #46C7D2 0%, #0c8096 100%);
            border: 1px solid rgba(255,255,255,0.1);
            color: #ffffff;
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 0.82rem;
            padding: 12px 16px;
            border-radius: 10px;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            transition: all 0.25s;
            box-shadow: 0 4px 12px rgba(70, 199, 210, 0.2);
            display: block;
        }

        .bz-article-btn:hover {
            box-shadow: 0 6px 18px rgba(70, 199, 210, 0.3);
            transform: translateY(-1px);
        }

        .bz-article-btn-secondary {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #f1f5f9;
            box-shadow: none;
        }

        .bz-article-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.07);
            border-color: rgba(255, 255, 255, 0.15);
            color: #ffffff;
            transform: translateY(-1px);
        }

        /* 5. Support CTA Footer inside Widget */
        .bz-help-footer {
            padding: 16px 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(11, 17, 26, 0.4);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .bz-footer-support-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .bz-footer-support-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 0.78rem;
            color: #ffffff;
        }

        .bz-footer-support-desc {
            font-size: 0.68rem;
            color: #cbd5e1;
        }

        .bz-footer-support-btn {
            background: rgba(70, 199, 210, 0.1);
            border: 1px solid rgba(70, 199, 210, 0.25);
            color: #46C7D2;
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 0.72rem;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-block;
        }

        .bz-footer-support-btn:hover {
            background: rgba(70, 199, 210, 0.2);
            color: #ffffff;
        }

        /* 6. Real-time Search Results overlay panel */
        .bz-search-results-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1D2A3E;
            z-index: 10;
            padding: 20px;
            box-sizing: border-box;
            display: none;
            flex-direction: column;
            gap: 16px;
            overflow-y: auto;
        }

        .bz-search-results-overlay.active {
            display: flex;
        }

        .bz-search-results-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .bz-search-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 40px 20px;
            gap: 12px;
        }

        .bz-search-empty-graphic {
            font-size: 2rem;
            opacity: 0.5;
        }

        .bz-search-empty-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            color: #ffffff;
        }

        .bz-search-empty-desc {
            font-size: 0.78rem;
            color: #94a3b8;
            max-width: 200px;
            line-height: 1.4;
        }

        @media (max-width: 500px) {
            .bz-help-panel {
                right: 12px;
                left: 12px;
                width: calc(100% - 24px);
                bottom: 84px;
                height: 540px;
            }
        }
    `;

    // Inject CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = css;
    document.head.appendChild(styleElement);

    // 2. FAQ ARTICLES DATABASE (Structured predefined answers & guide steps)
    const articles = {
        // Suggested / Home Index list
        'tracking-how': {
            id: 'tracking-how',
            category: 'Rastreo',
            title: '¿Cómo funciona el rastreo live?',
            content: `
                <p>Nuestro sistema de <strong>Rastreo Live</strong> mapea la posición exacta de tus paquetes importados. Lee las coordenadas GPS satelitales en tiempo real y calcula tu hora estimada de entrega en Costa Rica.</p>
                <div class="bz-steps-card">
                    <div class="bz-step-row">
                        <span class="bz-step-num">1</span>
                        <p class="bz-step-text"><strong>Ingreso en Miami:</strong> El paquete es escaneado en báscula electrónica al ingresar a nuestras bodegas en Florida.</p>
                    </div>
                    <div class="bz-step-row">
                        <span class="bz-step-num">2</span>
                        <p class="bz-step-text"><strong>Tránsito Aéreo:</strong> Vuelo internacional directo y liquidación en aduanas digitales (Hacienda Costa Rica).</p>
                    </div>
                    <div class="bz-step-row">
                        <span class="bz-step-num">3</span>
                        <p class="bz-step-text"><strong>Camioneta GPS Live:</strong> Al liberarse aduanas, se asigna chofer y mapa de GPS dinámico directo a tu puerta.</p>
                    </div>
                </div>
            `,
            ctaText: 'Abrir Rastreador Live ➔',
            ctaUrl: 'tracker.html'
        },
        'mailbox-how': {
            id: 'mailbox-how',
            category: 'Casillero',
            title: '¿Cómo creo mi casillero gratis?',
            content: `
                <p>Crear tu casillero en Miami es gratis e inmediato. Te asignamos una suite exclusiva y dirección fiscal estadounidense para colocar como dirección de entrega en tus compras de Amazon, eBay y más.</p>
                <div class="bz-steps-card">
                    <div class="bz-step-row">
                        <span class="bz-step-num">1</span>
                        <p class="bz-step-text"><strong>Registro:</strong> Ingresa tus datos en nuestro portal web.</p>
                    </div>
                    <div class="bz-step-row">
                        <span class="bz-step-num">2</span>
                        <p class="bz-step-text"><strong>Código BZ Suite:</strong> Te asignamos una suite única para identificar tus fletes (Ej: BZ-5062-MIA).</p>
                    </div>
                    <div class="bz-step-row">
                        <span class="bz-step-num">3</span>
                        <p class="bz-step-text"><strong>Compra:</strong> Coloca la dirección física de Miami como dirección de entrega en las tiendas de tu preferencia.</p>
                    </div>
                </div>
            `,
            ctaText: 'Crear mi Casillero Ahora ➔',
            ctaUrl: 'signup.html'
        },
        'calc-how': {
            id: 'calc-how',
            category: 'Calculadora',
            title: '¿Cómo funciona la calculadora de tarifas?',
            content: `
                <p>Nuestra calculadora estima de forma automática las tarifas aéreas o marítimas basándose en la normativa de cobro IATA, y calcula los impuestos CIF correspondientes al Ministerio de Hacienda de Costa Rica.</p>
                <div class="bz-steps-card">
                    <div class="bz-step-row">
                        <span class="bz-step-num">1</span>
                        <p class="bz-step-text"><strong>Peso Cobrable:</strong> Se utiliza el mayor entre el peso real y volumen chargeable (IATA volumetric standard).</p>
                    </div>
                    <div class="bz-step-row">
                        <span class="bz-step-num">2</span>
                        <p class="bz-step-text"><strong>Valor CIF Base:</strong> Calcula los impuestos fiscales según <code>FOB + Freight + Seguro</code>.</p>
                    </div>
                    <div class="bz-step-row">
                        <span class="bz-step-num">3</span>
                        <p class="bz-step-text"><strong>Conversor CRC:</strong> Convierte tus tarifas de USD a Colones ₡ a un tipo de cambio estándar de 515 CRC.</p>
                    </div>
                </div>
            `,
            ctaText: 'Ir a la Calculadora Completa ➔',
            ctaUrl: 'calculator.html'
        },
        'prealert-how': {
            id: 'prealert-how',
            category: 'Paquetes',
            title: '¿Cómo funcionan las Prealertas?',
            content: `
                <p>Una <strong>Prealerta</strong> consiste en subir la factura comercial o PDF de tu compra antes de que el paquete llegue a Miami. Esto acelera el trámite aduanal en Costa Rica un 80% y reduce demoras innecesarias.</p>
                <div class="bz-steps-card">
                    <div class="bz-step-row">
                        <span class="bz-step-num">1</span>
                        <p class="bz-step-text"><strong>Comprar:</strong> Adquiere tu artículo en la tienda y espera a que te den el tracking number.</p>
                    </div>
                    <div class="bz-step-row">
                        <span class="bz-step-num">2</span>
                        <p class="bz-step-text"><strong>Registrar:</strong> Ve a la pestaña Prealerta en tu dashboard, ingresa la tienda, tracking y valor FOB.</p>
                    </div>
                    <div class="bz-step-row">
                        <span class="bz-step-num">3</span>
                        <p class="bz-step-text"><strong>Adjuntar:</strong> Sube tu factura o invoice para que nuestros operadores de aduana lo nacionalicen de inmediato.</p>
                    </div>
                </div>
            `,
            ctaText: 'Iniciar Prealerta de Paquete ➔',
            ctaUrl: 'prealert.html'
        },
        'status-how': {
            id: 'status-how',
            category: 'Rastreo',
            title: '¿Qué significan los estados del envío?',
            content: `
                <p>Para reducir fricción y mantenerte al tanto, dividimos los estados logísticos en 5 hitos claros y transparentes:</p>
                <div class="bz-steps-card">
                    <div class="bz-step-row">
                        <p class="bz-step-text">⚡ <strong>Prealertado:</strong> Subiste la factura y estamos listos para recibir el paquete en Miami.</p>
                    </div>
                    <div class="bz-step-row">
                        <p class="bz-step-text">📦 <strong>Listo en Miami:</strong> El paquete ingresó y fue pesado en nuestras bodegas de Florida.</p>
                    </div>
                    <div class="bz-step-row">
                        <p class="bz-step-text">✈️ <strong>En Tránsito Aéreo:</strong> Tu flete vuela a San José y entra en validación de aduanas.</p>
                    </div>
                    <div class="bz-step-row">
                        <p class="bz-step-text">🚚 <strong>En Reparto Local:</strong> El paquete fue nacionalizado y el chofer lo lleva a tu casa.</p>
                    </div>
                    <div class="bz-step-row">
                        <p class="bz-step-text">✓ <strong>Entregado:</strong> Recibiste y firmaste la conformidad de entrega.</p>
                    </div>
                </div>
            `,
            ctaText: 'Buscar en Tracker de Guías ➔',
            ctaUrl: 'tracker.html'
        },

        // Categories Index list
        'tracking-restringidos': {
            id: 'tracking-restringidos',
            category: 'Rastreo',
            title: '¿Qué artículos son restringidos o prohibidos?',
            content: `
                <p>Por normativas de aviación comercial internacional y leyes costarricenses, está prohibido importar explosivos, armas de fuego, narcóticos, licores, o dinero en efectivo.</p>
                <p>Artículos que requieren permisos del Ministerio de Salud (restringidos) incluyen: perfumes, cosméticos, suplementos alimenticios, y cremas corporales. Nuestro equipo aduanal gestiona estos permisos por ti de forma ágil.</p>
            `,
            ctaText: 'Contactar Asesor de Aduanas ➔',
            ctaUrl: 'https://wa.me/50660696039?text=Hola,%20quisiera%20consultar%20sobre%20los%20permisos%20de%20importación'
        },
        'calc-impuestos': {
            id: 'calc-impuestos',
            category: 'Calculadora',
            title: '¿Cuáles son las tasas de impuesto arancelario?',
            content: `
                <p>El Ministerio de Hacienda aplica aranceles según la clasificación de tu artículo:</p>
                <ul>
                    <li><strong>Tecnología e Informática:</strong> 13% IVA.</li>
                    <li><strong>Artículos de Hogar, Ropa y Calzado:</strong> 29.95% total.</li>
                    <li><strong>Cosméticos y Cuidado Personal:</strong> 54.55% total.</li>
                    <li><strong>Repuestos e Indumentaria:</strong> 29.95% total.</li>
                </ul>
                <p>Nuestra calculadora en línea aplica estas tasas correspondientes al valor CIF del producto de forma automatizada.</p>
            `,
            ctaText: 'Abrir Calculadora de Impuestos ➔',
            ctaUrl: 'calculator.html'
        },
        'mailbox-direcciones': {
            id: 'mailbox-direcciones',
            category: 'Casillero',
            title: '¿Cómo coloco la dirección de Miami en mis compras?',
            content: `
                <p>Debes colocar los datos exactamente como te los mostramos en tu Casillero de Onboarding. He aquí la plantilla estándar:</p>
                <div class="bz-steps-card">
                    <p class="bz-step-text"><strong>Full Name:</strong> Tu nombre completo + Tu Suite (Ej: Juan Perez BZ-5062-MIA)</p>
                    <p class="bz-step-text"><strong>Address Line 1:</strong> 8540 NW 66th St</p>
                    <p class="bz-step-text"><strong>Address Line 2:</strong> Suite BZ-5062-MIA</p>
                    <p class="bz-step-text"><strong>City / State / Zip:</strong> Miami, FL 33166</p>
                    <p class="bz-step-text"><strong>Phone Number:</strong> +1 (786) 360-2810</p>
                </div>
            `,
            ctaText: 'Ver Mi Dirección Completa ➔',
            ctaUrl: 'dashboard.html'
        },
        'packages-bodega': {
            id: 'packages-bodega',
            category: 'Paquetes',
            title: '¿Cuánto tiempo de almacenamiento gratuito tengo?',
            content: `
                <p>Ofrecemos <strong>hasta 30 días naturales de almacenamiento gratuito</strong> en nuestras bodegas de Miami para que puedas consolidar múltiples compras de diferentes tiendas y enviarlas en un solo vuelo para ahorrar flete local.</p>
                <p>A partir del día 31, se cobrará una tarifa de $0.50 USD diarios por libra en concepto de bodegaje.</p>
            `,
            ctaText: 'Ver Mis Paquetes en Bodega ➔',
            ctaUrl: 'packages.html'
        },
        'payments-sinpe': {
            id: 'payments-sinpe',
            category: 'Pagos',
            title: '¿Cómo pagar por medio de Sinpe Móvil?',
            content: `
                <p>Puedes liquidar tus fletes e impuestos nacionales a través de **SINPE Móvil** al número de teléfono comercial de BreezeGo:</p>
                <div class="bz-steps-card">
                    <p class="bz-step-text"><strong>Número SINPE:</strong> +506 4000-8910</p>
                    <p class="bz-step-text"><strong>A nombre de:</strong> BreezeGo Costa Rica S.A.</p>
                    <p class="bz-step-text"><strong>Detalle del pago:</strong> Debes colocar el código de tu paquete o suite (Ej: "Pago BZ-506-SJO" o "Flete Juan Perez").</p>
                </div>
                <p>Una vez realizado, nuestro sistema validará el depósito en menos de 10 minutos para autorizar la liberación del flete.</p>
            `,
            ctaText: 'Ver Cuenta Bancaria BAC ➔',
            ctaUrl: 'terms.html#pagos'
        },
        'support-horarios': {
            id: 'support-horarios',
            category: 'Soporte',
            title: '¿Cuáles son los canales y horarios de soporte?',
            content: `
                <p>BreezeGo se enfoca en resolver tus dudas de manera ágil. Puedes comunicarte con nosotros por los siguientes canales:</p>
                <ul>
                    <li>💬 <strong>WhatsApp:</strong> +506 6069-6039 (Respuesta inmediata).</li>
                    <li>📞 <strong>Teléfono:</strong> +506 6069-6039 (Lun-Vie de 8:00 AM a 6:00 PM).</li>
                    <li>📍 <strong>Oficinas:</strong> Centro Corporativo San José, Costa Rica.</li>
                </ul>
            `,
            ctaText: 'Escribir por WhatsApp a Soporte ➔',
            ctaUrl: 'https://wa.me/50660696039?text=Hola,%20necesito%20soporte%20con%20BreezeGo'
        }
    };

    // 3. CREATE FAB & HELP PANEL MARKUP
    const trigger = document.createElement('button');
    trigger.className = 'bz-help-trigger';
    trigger.id = 'bz-help-trigger-btn';
    trigger.ariaLabel = 'Abrir Centro de Ayuda BreezeGo';
    trigger.innerHTML = `
        <svg class="bz-help-icon-svg" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.86.51 3.59 1.4 5.09L2.05 21.8a1 1 0 0 0 1.25 1.25l4.71-1.35c1.5.89 3.23 1.4 5.09 1.4 5.52 0 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h-2v-2h4v4zm0-6h-2c0-1.66 1.34-3 3-3s3 1.34 3 3c0 .88-.36 1.67-1 2.2V14h-2v-2c0-.55.45-1 1-1 .55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1z"/>
        </svg>
        <span class="bz-help-badge"></span>
    `;

    const panel = document.createElement('div');
    panel.className = 'bz-help-panel';
    panel.id = 'bz-help-panel-widget';
    panel.innerHTML = `
        <!-- Panel Header -->
        <div class="bz-help-header">
            <div class="bz-help-header-top">
                <div class="bz-help-logo">🙋‍♂️</div>
                <div class="bz-help-header-title-wrap">
                    <h4 class="bz-help-title">Centro de Ayuda</h4>
                    <span class="bz-help-subtitle">Soporte intermedio e interactivo BreezeGo</span>
                </div>
            </div>
            <!-- Dynamic search center -->
            <div class="bz-help-search-wrapper">
                <svg class="bz-help-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" class="bz-help-search-input" id="bz-help-search-q" placeholder="Buscar preguntas frecuentes...">
            </div>
        </div>

        <!-- Scrollable panel body -->
        <div class="bz-help-body">
            
            <!-- VIEW A: Home (Suggested Index, Categories grid, Onboarding quick tips) -->
            <div class="bz-help-view bz-help-view-home" id="bz-view-home">
                
                <!-- Onboarding tips empty state visual -->
                <div class="bz-onboarding-tips">
                    <span class="bz-tips-lightbulb">💡</span>
                    <div class="bz-tips-content">
                        <span class="bz-tips-title">Guía de Inicio Rápido</span>
                        <p class="bz-tips-text">Realiza tu prealerta con la factura comercial antes de que tu compra llegue a Miami. ¡Esto reduce demoras aduanales un 80%!</p>
                    </div>
                </div>

                <!-- Suggested Questions Section -->
                <div>
                    <h5 class="bz-section-heading">Preguntas Sugeridas</h5>
                    <div class="bz-suggested-index">
                        <button class="bz-index-item" data-art="tracking-how">
                            <span class="bz-index-icon">🚚</span>
                            <span class="bz-index-text">¿Cómo funciona el rastreo live?</span>
                            <span class="bz-index-arrow">➔</span>
                        </button>
                        <button class="bz-index-item" data-art="mailbox-how">
                            <span class="bz-index-icon">📦</span>
                            <span class="bz-index-text">¿Cómo creo mi casillero gratis?</span>
                            <span class="bz-index-arrow">➔</span>
                        </button>
                        <button class="bz-index-item" data-art="calc-how">
                            <span class="bz-index-icon">🧮</span>
                            <span class="bz-index-text">¿Cómo estimar costos de envío?</span>
                            <span class="bz-index-arrow">➔</span>
                        </button>
                        <button class="bz-index-item" data-art="prealert-how">
                            <span class="bz-index-icon">⚡</span>
                            <span class="bz-index-text">¿Cómo funcionan las Prealertas?</span>
                            <span class="bz-index-arrow">➔</span>
                        </button>
                        <button class="bz-index-item" data-art="status-how">
                            <span class="bz-index-icon">🔍</span>
                            <span class="bz-index-text">¿Qué significan los estados del envío?</span>
                            <span class="bz-index-arrow">➔</span>
                        </button>
                    </div>
                </div>

                <!-- FAQ Categories Grid -->
                <div>
                    <h5 class="bz-section-heading">Categorías de Ayuda</h5>
                    <div class="bz-categories-grid">
                        <div class="bz-category-card" data-cat="Rastreo">
                            <div class="bz-cat-header">
                                <span class="bz-cat-icon">🚚</span>
                                <span class="bz-cat-count">3 FAQs</span>
                            </div>
                            <span class="bz-cat-name">Rastreo</span>
                            <p class="bz-cat-desc">Tracker live, restricciones y aduana local.</p>
                        </div>
                        <div class="bz-category-card" data-cat="Calculadora">
                            <div class="bz-cat-header">
                                <span class="bz-cat-icon">🧮</span>
                                <span class="bz-cat-count">3 FAQs</span>
                            </div>
                            <span class="bz-cat-name">Calculadora</span>
                            <p class="bz-cat-desc">Fletes, impuestos CIF, y cotizador.</p>
                        </div>
                        <div class="bz-category-card" data-cat="Casillero">
                            <div class="bz-cat-header">
                                <span class="bz-cat-icon">📦</span>
                                <span class="bz-cat-count">2 FAQs</span>
                            </div>
                            <span class="bz-cat-name">Casillero</span>
                            <p class="bz-cat-desc">Suite Miami, direcciones y registro.</p>
                        </div>
                        <div class="bz-category-card" data-cat="Paquetes">
                            <div class="bz-cat-header">
                                <span class="bz-cat-icon">⚡</span>
                                <span class="bz-cat-count">2 FAQs</span>
                            </div>
                            <span class="bz-cat-name">Paquetes</span>
                            <p class="bz-cat-desc">Prealertas, facturas, y bodegaje.</p>
                        </div>
                        <div class="bz-category-card" data-cat="Pagos">
                            <div class="bz-cat-header">
                                <span class="bz-cat-icon">💳</span>
                                <span class="bz-cat-count">1 FAQ</span>
                            </div>
                            <span class="bz-cat-name">Pagos</span>
                            <p class="bz-cat-desc">SINPE Móvil, transferencias y flete.</p>
                        </div>
                        <div class="bz-category-card" data-cat="Soporte">
                            <div class="bz-cat-header">
                                <span class="bz-cat-icon">📞</span>
                                <span class="bz-cat-count">1 FAQ</span>
                            </div>
                            <span class="bz-cat-name">Soporte</span>
                            <p class="bz-cat-desc">Canales de contacto y horarios.</p>
                        </div>
                    </div>
                </div>

            </div>

            <!-- VIEW B: Detail Article Viewer (visual response cards with predefined steps & custom CTAs) -->
            <div class="bz-help-view bz-help-view-detail" id="bz-view-detail">
                <!-- Back trigger bar -->
                <div class="bz-detail-back-bar" id="bz-detail-back-btn">
                    <span>← Regresar al inicio</span>
                </div>
                <!-- Article Placeholder content injected via JS -->
                <div id="bz-article-placeholder"></div>
            </div>

            <!-- VIEW C: Live Search overlay panel -->
            <div class="bz-search-results-overlay" id="bz-search-overlay">
                <div class="bz-search-results-list" id="bz-search-list-container"></div>
            </div>

        </div>

        <!-- Help Widget Footer -->
        <div class="bz-help-footer">
            <div class="bz-footer-support-text">
                <span class="bz-footer-support-title">¿Aún necesitas ayuda?</span>
                <span class="bz-footer-support-desc">Respuesta en menos de 2 horas</span>
            </div>
            <a href="https://wa.me/50660696039?text=Hola,%20necesito%20soporte%20con%20BreezeGo" target="_blank" rel="noopener noreferrer" class="bz-footer-support-btn">Soporte Directo</a>
        </div>
    `;

    // Append trigger & panel to DOM
    document.body.appendChild(trigger);
    document.body.appendChild(panel);

    // 4. INTERACTIVE DOM EVENTS & ROUTING HOOKS
    const viewHome = document.getElementById('bz-view-home');
    const viewDetail = document.getElementById('bz-view-detail');
    const articlePlaceholder = document.getElementById('bz-article-placeholder');
    const btnBack = document.getElementById('bz-detail-back-btn');
    const triggerBadge = trigger.querySelector('.bz-help-badge');
    const searchInput = document.getElementById('bz-help-search-q');
    const searchOverlay = document.getElementById('bz-search-overlay');
    const searchListContainer = document.getElementById('bz-search-list-container');

    // Toggle widget panel visibility
    trigger.addEventListener('click', () => {
        trigger.classList.toggle('open');
        panel.classList.toggle('open');
        
        // Remove badge notification indicator
        if (triggerBadge) {
            triggerBadge.remove();
        }

        // Focus search input on open
        if (panel.classList.contains('open')) {
            setTimeout(() => searchInput.focus(), 150);
        }
    });

    // Collision avoidance adjustments depending on Cookie Consent card state
    const adjustPosition = () => {
        const cookieBanner = document.getElementById('bz-cookie-banner-card');
        if (cookieBanner) {
            trigger.style.bottom = '120px';
            panel.style.bottom = '192px';
        } else {
            trigger.style.bottom = '';
            panel.style.bottom = '';
        }
    };
    
    // Check periodically for Cookie Consent async injection
    setTimeout(adjustPosition, 100);
    setTimeout(adjustPosition, 500);
    setTimeout(adjustPosition, 1000);
    
    // Restore bottom coordinates when cookie consent is decided
    document.body.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'bz-cookie-accept' || e.target.id === 'bz-cookie-reject' || e.target.id === 'bz-cookie-customize')) {
            setTimeout(() => {
                trigger.style.transition = 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                panel.style.transition = 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                trigger.style.bottom = '';
                panel.style.bottom = '';
            }, 100);
        }
    });

    // Navigation function to slide views smoothly
    const openArticle = (artKey) => {
        const article = articles[artKey];
        if (!article) return;

        // Clear search results and input if open
        searchOverlay.classList.remove('active');
        searchInput.value = '';

        // Inject Content markup
        articlePlaceholder.innerHTML = `
            <div class="bz-detail-header">
                <span class="bz-article-category">${article.category}</span>
                <h3 class="bz-article-title">${article.title}</h3>
            </div>
            <div class="bz-article-content">
                ${article.content}
                <div class="bz-article-actions">
                    <a href="${article.ctaUrl}" class="bz-article-btn">${article.ctaText}</a>
                    <a href="https://wa.me/50660696039?text=Hola,%20tengo%20una%20duda%20sobre:%20${encodeURIComponent(article.title)}" target="_blank" rel="noopener noreferrer" class="bz-article-btn bz-article-btn-secondary">Hacer otra pregunta por WhatsApp</a>
                </div>
            </div>
        `;

        // Slide view active states
        viewHome.classList.add('inactive');
        viewDetail.classList.add('active');
        viewDetail.scrollTop = 0;
    };

    const returnToHome = () => {
        viewDetail.classList.remove('active');
        viewHome.classList.remove('inactive');
    };

    // Click triggers for Suggested Questions index items
    viewHome.addEventListener('click', (e) => {
        const btnIndex = e.target.closest('.bz-index-item');
        if (btnIndex) {
            const artKey = btnIndex.getAttribute('data-art');
            openArticle(artKey);
            return;
        }

        // Click triggers for Categories Grid
        const btnCat = e.target.closest('.bz-category-card');
        if (btnCat) {
            const catName = btnCat.getAttribute('data-cat');
            // Filter all articles under this category
            const filteredKeys = Object.keys(articles).filter(key => articles[key].category === catName);
            if (filteredKeys.length > 0) {
                // Instantly open search panel populated with category list
                searchListContainer.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:10px; margin-bottom:10px;">
                        <h4 style="font-family:'Montserrat',sans-serif; font-size:0.9rem; color:#46C7D2; margin:0;">Categoría: ${catName}</h4>
                        <span style="font-size:0.75rem; color:#94a3b8; cursor:pointer;" id="bz-clear-filter-btn">Cerrar</span>
                    </div>
                `;
                filteredKeys.forEach(key => {
                    const art = articles[key];
                    const item = document.createElement('div');
                    item.className = 'bz-index-item';
                    item.style.padding = '12px 14px';
                    item.innerHTML = `
                        <span class="bz-index-icon">❓</span>
                        <span class="bz-index-text" style="font-size:0.82rem;">${art.title}</span>
                        <span class="bz-index-arrow">➔</span>
                    `;
                    item.addEventListener('click', () => openArticle(key));
                    searchListContainer.appendChild(item);
                });
                
                searchOverlay.classList.add('active');

                // Clear/close filters listener inside overlays
                document.getElementById('bz-clear-filter-btn').addEventListener('click', () => {
                    searchOverlay.classList.remove('active');
                });
            }
        }
    });

    btnBack.addEventListener('click', returnToHome);

    // 5. REAL-TIME SEARCH INDEX FILTERING
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            searchOverlay.classList.remove('active');
            return;
        }

        // Filter articles by keyword matches
        const matches = Object.keys(articles).filter(key => {
            const art = articles[key];
            return art.title.toLowerCase().includes(query) || 
                   art.category.toLowerCase().includes(query) || 
                   art.content.toLowerCase().includes(query);
        });

        searchListContainer.innerHTML = '';

        if (matches.length > 0) {
            matches.forEach(key => {
                const art = articles[key];
                const item = document.createElement('button');
                item.className = 'bz-index-item';
                item.style.width = '100%';
                item.innerHTML = `
                    <span class="bz-index-icon">❓</span>
                    <span class="bz-index-text" style="font-size:0.82rem; font-family:'Inter',sans-serif;">${art.title}</span>
                    <span class="bz-index-arrow">➔</span>
                `;
                item.addEventListener('click', () => openArticle(key));
                searchListContainer.appendChild(item);
            });
        } else {
            // Render beautiful empty search state
            searchListContainer.innerHTML = `
                <div class="bz-search-empty-state">
                    <span class="bz-search-empty-graphic">🔍</span>
                    <span class="bz-search-empty-title">Sin resultados</span>
                    <p class="bz-search-empty-desc">No encontramos coincidencias para "${query}". Intenta buscar "rastreo", "tasas" o "casillero".</p>
                </div>
            `;
        }

        searchOverlay.classList.add('active');
    });

})();

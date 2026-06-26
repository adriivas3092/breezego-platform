/**
 * BreezeGo Premium Product Roadmap & MVP Console JS
 * Handles high-fidelity ScrollSpy, smooth TOC scrolling, and interactive Kanban sprint terminal simulator.
 */
(function() {
    'use strict';

    // 1. SELECTORS & DOM ELEMENTS
    const scrollContainer = document.getElementById('roadmap-scroll-container');
    const tocLinks = document.querySelectorAll('#roadmap-sidebar-toc .toc-link');
    const sections = document.querySelectorAll('.spec-section');
    const kanbanCards = document.querySelectorAll('.kanban-card');
    const terminal = document.getElementById('kanban-console-terminal');

    if (!scrollContainer || tocLinks.length === 0 || sections.length === 0) return;

    // 2. KANBAN SPRINT TERMINAL DATASET
    const taskDetails = {
        task_payment: {
            title: "Automate SINPE Checking",
            priority: "ALTA",
            stream: "Backend / APIs",
            status: "PENDIENTE (TO DO)",
            desc: "Automatización de verificación de depósitos SINPE Móvil mediante procesamiento automático de notificaciones entrantes.",
            steps: [
                "Configurar webhook listener seguro con firma criptográfica en Node.js.",
                "Diseñar regex parser optimizado para extraer montos, referencias y números de origen.",
                "Ejecutar conciliación en lote contra facturas pendientes de flete en PostgreSQL.",
                "Habilitar base de datos bloqueante temporal para evitar doble gasto (Race conditions)."
            ]
        },
        task_routes: {
            title: "AI Driver Route Optimization",
            priority: "BAJA",
            stream: "Algorithms / Logistics",
            status: "PENDIENTE (TO DO)",
            desc: "Motor de enrutamiento inteligente basado en la API de OSRM y modelos locales para predecir tráfico en el GAM (Costa Rica).",
            steps: [
                "Mapear coordenadas GPS históricas de choferes en San José, Alajuela, Heredia y Cartago.",
                "Desarrollar algoritmo heurístico de optimización de rutas (problema del viajante con ventanas de tiempo).",
                "Integrar alertas meteorológicas dinámicas del IMN para desvíos automáticos.",
                "Consolidar tiempos de carga estimados en aduanas terrestres."
            ]
        },
        task_mobile: {
            title: "React Native Scanners App",
            priority: "MEDIA",
            stream: "Mobile App",
            status: "EN PROGRESO",
            desc: "Aplicación nativa para operadores de bodega en Miami y Costa Rica con soporte para lectores de códigos de barra integrados y cámara física.",
            steps: [
                "Scaffolding inicial en React Native y Expo con TailwindCSS (NativeWind).",
                "Implementar lector de cámara usando Expo Camera con parser automático de códigos EAN/UPC y PDFs417.",
                "Configurar sincronización en segundo plano con base de datos sin conexión local (WatermelonDB).",
                "Pruebas de latencia en red móvil costarricense (3G/4G/5G)."
            ]
        },
        task_invoices: {
            title: "PDF Commercial Invoice Parser",
            priority: "ALTA",
            stream: "Backend / OCR",
            status: "EN PROGRESO",
            desc: "Extractor automático de metadatos de facturas comerciales subidas en pre-alertas mediante OCR (Tesseract) y modelos de lenguaje locales.",
            steps: [
                "Desplegar pipeline en Python/Node para conversión de PDFs vectoriales e imágenes.",
                "Implementar extractor con heurísticas para peso CIF, descripción, arancel propuesto y valor FOB.",
                "Diseñar sistema de revisión manual (Human-in-the-loop) para excepciones ilegibles.",
                "Emitir pre-alertas sugeridas para confirmación del cliente en un solo clic."
            ]
        },
        task_cookies: {
            title: "Interactive Cookies Switch preferences",
            priority: "ALTA",
            stream: "Frontend",
            status: "EN REVISIÓN",
            desc: "Auditoría de cookies de terceros y desarrollo del panel de gestión granular de consentimiento en cumplimiento con GDPR y Ley 8968.",
            steps: [
                "Diseñar modal UI glassmorphic responsivo con control de toggles atómicos.",
                "Vincular switches (Necesarias, Preferencias, Estadísticas, Marketing) con localStorage.",
                "Bloquear la carga de scripts externos (Google Analytics, Hotjar) antes del consentimiento explícito.",
                "Registrar hash de consentimiento anónimo en logs de auditoría técnica."
            ]
        },
        task_signup: {
            title: "Focus OTP Signup multi-step",
            priority: "CRÍTICA",
            stream: "Auth / UI",
            status: "COMPLETADO",
            desc: "Flujo de registro premium con verificación OTP móvil interactiva y asignación instantánea de casillero físico en Miami.",
            steps: [
                "Crear formulario interactivo de 3 pasos con validación estricta Zod en el frontend.",
                "Integrar pasarela Twilio Verify API para envío y validación de tokens de 6 dígitos en Costa Rica.",
                "Generar address de casillero BreezeGo automática en formato '7801 NW 37th St, Suite BG-XXXXX'.",
                "Registrar perfil de usuario con encriptación robusta de datos confidenciales."
            ]
        },
        task_tracker: {
            title: "SVG Ticker Tracker Live path",
            priority: "CRÍTICA",
            stream: "Tracking",
            status: "COMPLETADO",
            desc: "Rastreador GPS interactivo que renderiza rutas logísticas dinámicas mediante trazos SVG animados y mapas satelitales simplificados.",
            steps: [
                "Integrar mapas SVG reactivos con trazado suavizado usando curvas Bezier cúbicas.",
                "Simular coordenadas de chofer en tiempo real con transiciones por interpolación lineal.",
                "Implementar animaciones CSS dinámicas de pulso (ping) y camiones en movimiento.",
                "Sincronizar eventos de estado (Miami -> Tránsito -> Aduanas -> Reparto -> Entregado)."
            ]
        },
        task_help: {
            title: "Smart Help FAQ Center FAB",
            priority: "MEDIA",
            stream: "Support Center",
            status: "COMPLETADO",
            desc: "Widget flotante premium con respuestas pregrabadas, buscador instantáneo difuso y disparador de tickets contextuales.",
            steps: [
                "Estructurar componente JavaScript autónomo con soporte nativo de buscador y colapsables.",
                "Pre-cargar base de conocimientos categorizada de 25 preguntas frecuentes sobre fletes y aduanas.",
                "Añadir disparador de ticket de soporte conectado al operador en vivo con adjuntos.",
                "Adaptar viewport para visualización impecable en dispositivos móviles tipo Safari."
            ]
        }
    };

    // 3. INTERACTIVE TERMINAL LOG LOGGER SIMULATOR
    let terminalTimeoutIds = [];

    const printToTerminal = (taskKey) => {
        // Clear active timeouts
        terminalTimeoutIds.forEach(id => clearTimeout(id));
        terminalTimeoutIds = [];

        const task = taskDetails[taskKey];
        if (!task || !terminal) return;

        // Clear terminal content
        terminal.innerHTML = '';

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

        // Create log sequences
        const logs = [
            { text: `[${timeStr}] INIT SPECIFICATION DE SPRINT PARA TAREA: ${taskKey.toUpperCase()}`, type: 'title' },
            { text: `[INFO] Flujo: ${task.stream} | Prioridad: ${task.priority} | Estado: ${task.status}`, type: 'info' },
            { text: `[DESC] ${task.desc}`, type: 'desc' },
            { text: `[PASOS DE IMPLEMENTACIÓN SPRINT]:`, type: 'title' }
        ];

        task.steps.forEach((step, index) => {
            logs.push({ text: `  -> [Paso ${index + 1}] ${step}`, type: 'bullet' });
        });

        // Add a success confirmation line
        logs.push({ text: `[${timeStr}] SYNCHRONIZED SUCCESSFULLY WITH SPRINT CONTROLLER. STATUS = READY.`, type: 'info' });

        // Print lines with simulated staggered typewriter rendering delay
        logs.forEach((log, index) => {
            const timeoutId = setTimeout(() => {
                const row = document.createElement('div');
                row.className = `log-row ${log.type}`;
                row.textContent = log.text;
                terminal.appendChild(row);
                
                // Auto scroll to bottom
                terminal.scrollTop = terminal.scrollHeight;
            }, index * 80);
            
            terminalTimeoutIds.push(timeoutId);
        });
    };

    // Bind Kanban card clicks
    kanbanCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active states from other cards
            kanbanCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            const taskKey = card.getAttribute('data-task');
            if (taskKey) {
                printToTerminal(taskKey);
            }
        });
    });

    // 4. SMOOTH SCROLLING INDEX NAVIGATION
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSec = document.querySelector(targetId);

            if (targetSec) {
                // Remove active classes from all TOC links
                tocLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Scroll smoothly
                const scrollOffset = targetSec.offsetTop - scrollContainer.offsetTop - 10;
                scrollContainer.scrollTo({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 5. HIGH PERFORMANCE SCROLLSPY
    let isScrolling = false;

    scrollContainer.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                updateActiveLinkOnScroll();
                isScrolling = false;
            });
            isScrolling = true;
        }
    });

    const updateActiveLinkOnScroll = () => {
        const containerTop = scrollContainer.scrollTop;
        const containerHeight = scrollContainer.clientHeight;
        const scrollHeight = scrollContainer.scrollHeight;

        // Check if scrolled to the absolute bottom
        if (containerTop + containerHeight >= scrollHeight - 25) {
            tocLinks.forEach(l => l.classList.remove('active'));
            tocLinks[tocLinks.length - 1].classList.add('active');
            return;
        }

        let currentSectionId = '';

        sections.forEach(sec => {
            const secTop = sec.offsetTop - scrollContainer.offsetTop;
            if (containerTop >= secTop - 80) {
                currentSectionId = sec.getAttribute('id');
            }
        });

        if (currentSectionId) {
            tocLinks.forEach(link => {
                if (link.getAttribute('href') === `#${currentSectionId}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    };

})();

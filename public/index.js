/* BreezeGo Interactivity Engine & Logistical Controllers */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. Mobile Menu Drawer Toggle
    // -------------------------------------------------------------
    const menuToggle = document.getElementById('menu-toggle-btn');
    const navMenu = document.getElementById('nav-menu-container');
    const navLinks = document.querySelectorAll('.nav-link');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
            
            // Toggle hamburger icon animation or state if desired
            const isOpen = navMenu.classList.contains('active');
            menuToggle.innerHTML = isOpen 
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;
        });

        // Close menu when a navigation item is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;
            });
        });

        // Close menu on click outside
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                menuToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;
            }
        });
    }

    // Scroll styling header changes
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });


    // -------------------------------------------------------------
    // 2. Real-Time Tracking Database & Interface Simulator
    // -------------------------------------------------------------
    const trackingMockDB = {
        'BZ-506-SJO': {
            recipient: 'Carlos Alvarado M.',
            description: 'Audífonos Inalámbricos Pro + Estuche (FOB $124.00)',
            weight: '2.4 Lbs',
            statusText: 'En Tránsito Aéreo',
            statusClass: 'in-transit',
            progress: 50,
            milestones: [true, true, false, false], // [Miami, Vuelo, Aduana, Reparto]
            currentStep: 2, // Second step is glowing
            history: [
                { time: 'Hoy, 09:14 AM', title: 'En tránsito aéreo hacia SJO', text: 'Vuelo de carga BZ-730, estimado arribar hoy 04:30 PM.' },
                { time: 'Ayer, 04:30 PM', title: 'Procesado y preparado para despacho', text: 'Almacén principal Miami, FL. Manifiesto de vuelo cerrado.' },
                { time: '24 May, 10:12 AM', title: 'Recibido en Casillero Miami', text: 'Ingreso registrado en báscula con peso de 2.4 Lbs. Inspección visual OK.' }
            ]
        },
        'BZ-MIA-9081': {
            recipient: 'Viviana Castro R.',
            description: 'Paquete de Ropa Deportiva Nike & Sephora (FOB $92.50)',
            weight: '4.1 Lbs',
            statusText: 'Listo en Miami',
            statusClass: 'miami',
            progress: 25,
            milestones: [true, false, false, false],
            currentStep: 1,
            history: [
                { time: 'Hoy, 08:30 AM', title: 'Recibido y Pesado en Miami', text: 'Bodega de Miami, FL. Esperando vuelo programado de mañana martes.' },
                { time: 'Ayer, 01:15 PM', title: 'Prealerta de Casillero Registrada', text: 'El usuario subió la factura de Amazon. Listo para precalificación fiscal.' }
            ]
        },
        'BZ-CR-9999': {
            recipient: 'Mario Segura G.',
            description: 'Libros Técnicos de Ingeniería (FOB $45.00)',
            weight: '1.8 Lbs',
            statusText: 'Entregado en Casa',
            statusClass: 'delivered',
            progress: 100,
            milestones: [true, true, true, true],
            currentStep: 4,
            history: [
                { time: '23 May, 02:40 PM', title: 'Paquete Entregado con Éxito', text: 'Entregado a destinatario en Montes de Oca, San José. Firmado por: Mario Segura.' },
                { time: '23 May, 08:15 AM', title: 'Salida a Reparto Local', text: 'En ruta en camioneta de distribución local BreezeGo (Zona GAM-1).' },
                { time: '22 May, 03:00 PM', title: 'Liberación de Aduanas Completada', text: 'Nacionalizado mediante sistema TICA del Ministerio de Hacienda. Impuestos liquidados.' },
                { time: '21 May, 05:22 PM', title: 'Arribo a Aeropuerto SJO', text: 'Paquete arribó en el vuelo de carga. Traslado a almacén fiscal.' }
            ]
        }
    };

    // Tracking Handler
    function handleTrackingSearch(trackCode) {
        const cleanedCode = trackCode.trim().toUpperCase();
        const resContent = document.getElementById('tracking-result-content');
        
        if (!resContent) return;

        // Visual fade out and fade in effect
        resContent.style.opacity = '0.3';
        
        setTimeout(() => {
            let data = trackingMockDB[cleanedCode];

            // If not found in mock DB, generate a cool fake custom simulator tracking
            if (!data) {
                if (cleanedCode.length < 4) {
                    alert('Por favor, ingrese un código de rastreo válido. Ej: BZ-506-SJO');
                    resContent.style.opacity = '1';
                    return;
                }
                
                data = {
                    recipient: 'Cliente Especial BreezeGo',
                    description: `Envío Internacional Registrado (${cleanedCode})`,
                    weight: '3.0 Lbs',
                    statusText: 'Validando en Sistema',
                    statusClass: 'in-transit',
                    progress: 75,
                    milestones: [true, true, true, false],
                    currentStep: 3,
                    history: [
                        { time: 'Hace unos momentos', title: 'Nacionalización e Inspección de Hacienda', text: 'En proceso de aforo físico en terminal de carga Costa Rica.' },
                        { time: 'Ayer', title: 'Vuelo Arribado a San José', text: 'Desembarque completado en el Aeropuerto Juan Santamaría.' },
                        { time: 'Hace 2 días', title: 'Despacho de Bodega Miami', text: 'Paquete vuela en ruta consolidada BreezeGo Courier.' }
                    ]
                };
            }

            // Update DOM with results
            document.getElementById('res-code').textContent = cleanedCode;
            
            const statusPill = document.getElementById('res-status-pill');
            statusPill.textContent = data.statusText;
            statusPill.className = `status-indicator-pill ${data.statusClass}`;
            
            document.getElementById('res-recipient').textContent = data.recipient;
            document.getElementById('res-desc').textContent = data.description;
            document.getElementById('res-weight').textContent = data.weight;
            
            // Timeline progress bar
            const progressBar = document.getElementById('timeline-progress');
            progressBar.style.width = `${data.progress}%`;
            
            // Set milestone steps
            for (let i = 1; i <= 4; i++) {
                const milestoneEl = document.getElementById(`mile-${i}`);
                milestoneEl.className = 'timeline-milestone'; // reset
                
                if (data.milestones[i - 1]) {
                    milestoneEl.classList.add('active');
                }
                
                if (data.currentStep === i) {
                    milestoneEl.classList.add('current-step');
                }
            }

            // Log history
            const historyList = document.getElementById('res-history-list');
            historyList.innerHTML = ''; // clear

            data.history.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = `history-item ${index === 0 ? 'current' : ''}`;
                itemDiv.innerHTML = `
                    <span class="history-time">${item.time}</span>
                    <div class="history-dot"></div>
                    <div class="history-info">
                        <p class="history-heading">${item.title}</p>
                        <p class="history-sub">${item.text}</p>
                    </div>
                `;
                historyList.appendChild(itemDiv);
            });

            resContent.style.opacity = '1';
            
            // Smoothly scroll to tracking segment dashboard if searched from Hero input
            if (window.scrollY < 400) {
                document.getElementById('tracking-section').scrollIntoView({ behavior: 'smooth' });
            }
        }, 350);
    }

    // Connect Search Elements
    const quickTrackInput = document.getElementById('quick-tracking-input');
    const quickTrackBtn = document.getElementById('quick-tracking-btn');
    
    if (quickTrackBtn && quickTrackInput) {
        quickTrackBtn.addEventListener('click', () => {
            const val = quickTrackInput.value;
            if (val) window.location.href = `tracker.html?code=${encodeURIComponent(val)}`;
        });
        
        quickTrackInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = quickTrackInput.value;
                if (val) window.location.href = `tracker.html?code=${encodeURIComponent(val)}`;
            }
        });
    }

    const panelTrackInput = document.getElementById('panel-tracking-search');
    const panelTrackBtn = document.getElementById('panel-search-btn');

    if (panelTrackBtn && panelTrackInput) {
        panelTrackBtn.addEventListener('click', () => {
            const val = panelTrackInput.value;
            if (val) handleTrackingSearch(val);
        });

        panelTrackInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = panelTrackInput.value;
                if (val) handleTrackingSearch(val);
            }
        });
    }

    // Connect Suggestion buttons
    const suggestBtns = document.querySelectorAll('.suggest-btn');
    suggestBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-code');
            if (quickTrackInput) {
                window.location.href = `tracker.html?code=${encodeURIComponent(code)}`;
            } else {
                if (panelTrackInput) panelTrackInput.value = code;
                handleTrackingSearch(code);
            }
        });
    });


    // -------------------------------------------------------------
    // 3. Volumetric Shipping Cost & Tax Calculator
    // -------------------------------------------------------------
    const calcOrigin = document.getElementById('calc-origin');
    const calcWeight = document.getElementById('calc-weight');
    const calcUnit = document.getElementById('calc-unit');
    const calcCategory = document.getElementById('calc-category');
    const calcValue = document.getElementById('calc-value');
    const calcDelivery = document.getElementById('calc-delivery');

    // Hacienda Tax percentages
    const categoryTaxRates = {
        general: 0.2995,
        electronics: 0.13,
        clothing: 0.2995,
        shoes: 0.2995,
        cosmetics: 0.5455,
        carparts: 0.4927,
        books: 0.01
    };

    function runCalculator() {
        if (!calcOrigin || !calcWeight || !calcUnit || !calcCategory || !calcValue) return;

        // Exchange rate (USD to Costa Rican Colones)
        const exchangeRate = 515;

        // 1. Get raw inputs
        let weight = parseFloat(calcWeight.value) || 0.1;
        if (weight < 0.1) weight = 0.1;

        const unit = calcUnit.value;
        const origin = calcOrigin.value;
        const category = calcCategory.value;
        const fValue = parseFloat(calcValue.value) || 0;
        const includeRuralDelivery = calcDelivery ? calcDelivery.checked : false;

        // Normalize weight to pounds (Lbs) for standard courier freight math
        let weightInLbs = weight;
        if (unit === 'kgs') {
            weightInLbs = weight * 2.20462;
        }

        // Update calculator input labels
        const weightLabel = document.getElementById('weight-unit-label');
        if (weightLabel) weightLabel.textContent = unit === 'lbs' ? 'Lbs' : 'Kgs';

        // 2. Calculations
        // Base Freight Rate (Flete) based on origin
        let freightPerLb = 3.50; // default miami
        let minFreight = 7.00;

        if (origin === 'china') {
            freightPerLb = 2.00;
            minFreight = 25.00; // Maritime shipment minimum cargo size
        } else if (origin === 'europe') {
            freightPerLb = 6.00;
            minFreight = 12.00;
        }

        let freightTotal = Math.max(minFreight, weightInLbs * freightPerLb);

        // Taxes based on Ministry of Hacienda guidelines (FOB value * rate)
        const taxRate = categoryTaxRates[category] || 0.2995;
        const taxTotal = fValue * taxRate;

        // Handling (Manejo aduanal y timbres)
        // Base handling cost is $4.50. Added $0.15/Lb if package exceeds 10 Lbs.
        let handlingTotal = 4.50;
        if (weightInLbs > 10) {
            handlingTotal += (weightInLbs - 10) * 0.15;
        }

        // Local Delivery inside Costa Rica
        // GAM standard is $3.00. Rural or express delivery (when checkbox selected) is $8.00 (Standard + $5).
        let deliveryTotal = 3.00;
        if (includeRuralDelivery) {
            deliveryTotal = 8.00;
        }

        // 3. Combined Totals
        const grandTotalUSD = freightTotal + taxTotal + handlingTotal + deliveryTotal;
        const grandTotalCRC = grandTotalUSD * exchangeRate;

        // 4. Update the results on screen
        document.getElementById('freight-desc').textContent = `${origin === 'miami' ? 'Miami' : origin === 'china' ? 'China' : 'Madrid'} a SJO (${weightInLbs.toFixed(1)} Lbs)`;
        document.getElementById('res-freight').textContent = `$${freightTotal.toFixed(2)}`;
        
        document.getElementById('tax-desc').textContent = `Aforo fiscal (${(taxRate * 100).toFixed(2)}%)`;
        document.getElementById('res-taxes').textContent = `$${taxTotal.toFixed(2)}`;
        
        document.getElementById('res-handling').textContent = `$${handlingTotal.toFixed(2)}`;
        
        document.getElementById('delivery-desc').textContent = includeRuralDelivery ? 'Zonas Rurales / Todo CR' : 'Gran Área Metropolitana';
        document.getElementById('res-delivery').textContent = `$${deliveryTotal.toFixed(2)}`;
        
        document.getElementById('calc-total-usd').textContent = `$${grandTotalUSD.toFixed(2)}`;
        document.getElementById('calc-total-crc').textContent = `≈ ₡${Math.round(grandTotalCRC).toLocaleString('es-CR')}`;
    }

    // Attach Event Listeners to Form Elements for Instant Calcs
    const elementsToWatch = [calcOrigin, calcWeight, calcUnit, calcCategory, calcValue, calcDelivery];
    elementsToWatch.forEach(el => {
        if (el) {
            el.addEventListener('input', runCalculator);
            el.addEventListener('change', runCalculator);
        }
    });

    // Run first initial calculation
    runCalculator();


    // -------------------------------------------------------------
    // 4. Interactive Accordion Toggles
    // -------------------------------------------------------------
    const faqTriggers = document.querySelectorAll('.faq-trigger');
    
    faqTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const item = trigger.parentElement;
            const panel = trigger.nextElementSibling;
            const isActive = item.classList.contains('active');

            // Close other items for single-open accordions (premium style)
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-panel').style.maxHeight = null;
            });

            if (!isActive) {
                item.classList.add('active');
                panel.style.maxHeight = panel.scrollHeight + 'px';
            }
        });
    });


    // -------------------------------------------------------------
    // 5. Numerical Counter Stats Animation (Stripe Style)
    // -------------------------------------------------------------
    const statNumbers = document.querySelectorAll('.stat-number');
    let countersAnimated = false;

    function animateCounters() {
        if (countersAnimated) return;

        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            let count = 0;
            const duration = 2000; // 2 seconds animation
            const increment = Math.ceil(target / (duration / 30));

            const timer = setInterval(() => {
                count += increment;
                if (count >= target) {
                    count = target;
                    clearInterval(timer);
                }

                // Beautiful format for thousands (150K+)
                if (target === 150000) {
                    stat.textContent = `${(count / 1000).toFixed(0)}K+`;
                } else if (target === 99) {
                    stat.textContent = `${count}%`;
                } else {
                    stat.textContent = `< ${count} d`;
                }
            }, 30);
        });

        countersAnimated = true;
    }

    // Simple Intersection Observer to animate only when visible
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        observer.observe(statsSection);
    }
});

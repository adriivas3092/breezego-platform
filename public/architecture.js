/**
 * BreezeGo Developer Console JS
 * Manages interactive schema search filters, role permissions matrices, 
 * simulated Row Level Security evaluate sandbox, and package state transitions detail cards.
 */
(function() {

    // 1. TABS NAVIGATION CONTROL
    const tabButtons = document.querySelectorAll('.dev-nav-btn');
    const tabPanels = document.querySelectorAll('.dev-tab-panel');
    const activeTabTitle = document.getElementById('dev-active-tab-title');
    const activeTabDesc = document.getElementById('dev-active-tab-desc');
    const dbSearchBox = document.getElementById('db-search-box');

    const tabMetadata = {
        database: {
            title: 'Plano Base de Datos',
            desc: 'Esquemas de tablas relacionales, llaves primarias/foráneas y tipos de columnas.'
        },
        roles: {
            title: 'Roles y Permisos',
            desc: 'Matriz interactiva de control de acceso basada en roles (RBAC).'
        },
        rls: {
            title: 'Row Level Security (RLS)',
            desc: 'Simulación interactiva de filtros de seguridad en la capa de datos de PostgreSQL.'
        },
        tracking: {
            title: 'Lógica de Rastreo de Paquetes',
            desc: 'Línea de tiempo de hitos logísticos, triggers automáticos y cálculos tarifarios.'
        },
        frontend: {
            title: 'Arquitectura Frontend',
            desc: 'Bloques de vistas modulares y flujo de sincronización de estados local.'
        },
        stack: {
            title: 'Infraestructura Cloud Stack',
            desc: 'Flujo de peticiones de clientes hacia Vercel, Supabase y el motor Postgres.'
        }
    };

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabKey = btn.getAttribute('data-tab');
            
            // Toggle active buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle active panels
            tabPanels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(`panel-${tabKey}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            // Update header info
            const meta = tabMetadata[tabKey];
            if (meta) {
                activeTabTitle.textContent = meta.title;
                activeTabDesc.textContent = meta.desc;
            }

            // Show search bar only on Database Blueprint tab
            if (tabKey === 'database') {
                dbSearchBox.style.display = 'flex';
            } else {
                dbSearchBox.style.display = 'none';
            }
        });
    });


    // 2. REAL-TIME SCHEMA SEARCH FILTER (Database tab)
    const schemaSearch = document.getElementById('dev-schema-search');
    const tableCards = document.querySelectorAll('.db-table-card');

    if (schemaSearch) {
        schemaSearch.addEventListener('input', () => {
            const query = schemaSearch.value.trim().toLowerCase();
            
            tableCards.forEach(card => {
                const tableName = card.querySelector('.table-name').textContent.toLowerCase();
                const tableDesc = card.querySelector('.table-desc').textContent.toLowerCase();
                const colRows = card.querySelectorAll('.col-row');
                
                let matchesTable = tableName.includes(query) || tableDesc.includes(query);
                let matchesColumn = false;

                colRows.forEach(row => {
                    const colName = row.querySelector('.col-name').textContent.toLowerCase();
                    const colType = row.querySelector('.col-type').textContent.toLowerCase();

                    if (query && (colName.includes(query) || colType.includes(query))) {
                        row.classList.add('highlight-col');
                        matchesColumn = true;
                    } else {
                        row.classList.remove('highlight-col');
                    }
                });

                if (!query) {
                    card.classList.remove('highlighted');
                    card.style.display = 'flex';
                } else if (matchesTable || matchesColumn) {
                    card.classList.add('highlighted');
                    card.style.display = 'flex';
                } else {
                    card.classList.remove('highlighted');
                    card.style.display = 'none';
                }
            });
        });
    }


    // 3. ROLES & PERMISSIONS MATRIX DATA & POPULATOR
    const rolePermissions = {
        client: [
            { name: 'profiles:read (self)', desc: 'Lectura de datos de perfil propio.', allowed: true },
            { name: 'profiles:write (self)', desc: 'Actualización de datos personales y entrega.', allowed: true },
            { name: 'packages:read (self)', desc: 'Visualización de paquetes y fletes propios.', allowed: true },
            { name: 'packages:write', desc: 'Registro directo de nuevos paquetes.', allowed: false },
            { name: 'pre_alerts:write (self)', desc: 'Creación de prealertas y carga de facturas.', allowed: true },
            { name: 'invoices:read (self)', desc: 'Ver desgloses de impuestos CIF y costos de fletes propios.', allowed: true },
            { name: 'admin_dashboard:access', desc: 'Acceso a consola interna de operadores logísticos.', allowed: false },
            { name: 'packages:modify_status', desc: 'Cambiar de estado paquetes en ruta.', allowed: false }
        ],
        operator: [
            { name: 'profiles:read (all)', desc: 'Lectura de datos de perfil de todos los clientes.', allowed: true },
            { name: 'profiles:write', desc: 'Actualización de datos de perfil generales.', allowed: false },
            { name: 'packages:read (all)', desc: 'Visualización de inventarios de fletes en sistema.', allowed: true },
            { name: 'packages:write', desc: 'Creación y pesaje físico de paquetes en Miami.', allowed: true },
            { name: 'pre_alerts:read', desc: 'Lectura de facturas prealertadas para liquidar CIF.', allowed: true },
            { name: 'invoices:read (all)', desc: 'Auditoría de desgloses e importes arancelarios.', allowed: true },
            { name: 'admin_dashboard:access', desc: 'Acceso a consola interna de operadores logísticos.', allowed: true },
            { name: 'packages:modify_status', desc: 'Cambiar de estado paquetes en ruta.', allowed: true }
        ],
        support: [
            { name: 'profiles:read (all)', desc: 'Lectura de datos de perfil de todos los clientes.', allowed: true },
            { name: 'profiles:write', desc: 'Actualización de datos de perfil generales.', allowed: false },
            { name: 'packages:read (all)', desc: 'Visualización de inventarios de fletes en sistema.', allowed: true },
            { name: 'packages:write', desc: 'Creación y pesaje físico de paquetes en Miami.', allowed: false },
            { name: 'pre_alerts:read', desc: 'Lectura de facturas prealertadas para resolver disputas.', allowed: true },
            { name: 'invoices:read (all)', desc: 'Auditoría de desgloses e importes arancelarios.', allowed: true },
            { name: 'admin_dashboard:access', desc: 'Acceso a consola interna de operadores logísticos.', allowed: true },
            { name: 'packages:modify_status', desc: 'Cambiar de estado paquetes en ruta.', allowed: false }
        ],
        admin: [
            { name: 'profiles:read (all)', desc: 'Lectura de datos de perfil de todos los clientes.', allowed: true },
            { name: 'profiles:write (all)', desc: 'Modificar datos de perfil de clientes.', allowed: true },
            { name: 'packages:read (all)', desc: 'Acceso completo a base de datos de cargas.', allowed: true },
            { name: 'packages:write (all)', desc: 'Creación y administración de paquetes.', allowed: true },
            { name: 'pre_alerts:read (all)', desc: 'Revisión y borrado de prealertas.', allowed: true },
            { name: 'invoices:write (all)', desc: 'Modificación manual de tasas arancelarias.', allowed: true },
            { name: 'admin_dashboard:access', desc: 'Acceso a consola interna de operadores logísticos.', allowed: true },
            { name: 'packages:modify_status', desc: 'Bypass completo de estados logísticos.', allowed: true }
        ]
    };

    const rolePills = document.querySelectorAll('.role-pill-btn');
    const permTitle = document.getElementById('perm-role-title');
    const permContainer = document.getElementById('perm-checkboxes-container');

    const renderPermissionsForRole = (roleKey) => {
        const perms = rolePermissions[roleKey];
        if (!perms) return;

        // Clean container
        permContainer.innerHTML = '';
        
        perms.forEach(perm => {
            const row = document.createElement('div');
            row.className = `perm-row ${perm.allowed ? 'allowed' : 'denied'}`;
            row.innerHTML = `
                <div class="perm-checkbox-glow">
                    ${perm.allowed ? '✓' : '✗'}
                </div>
                <div class="perm-info">
                    <span class="perm-name">${perm.name}</span>
                    <span class="perm-desc">${perm.desc}</span>
                </div>
            `;
            permContainer.appendChild(row);
        });
    };

    rolePills.forEach(pill => {
        pill.addEventListener('click', () => {
            rolePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const roleKey = pill.getAttribute('data-role');
            const roleName = pill.textContent;
            permTitle.textContent = `PERMISOS: ${roleName}`;
            renderPermissionsForRole(roleKey);
        });
    });

    // Initial render
    renderPermissionsForRole('client');


    // 4. ROW LEVEL SECURITY (RLS) SANDBOX EVALUATOR SIMULATOR
    const policyCards = document.querySelectorAll('.policy-card');
    const simAuthUid = document.getElementById('sim-auth-uid');
    const simResourceOwner = document.getElementById('sim-resource-owner');
    const btnRunSim = document.getElementById('btn-run-rls-sim');
    const simTerminal = document.getElementById('sim-terminal-logs');

    let activePolicyKey = 'profiles_select';

    policyCards.forEach(card => {
        card.addEventListener('click', () => {
            policyCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            activePolicyKey = card.getAttribute('data-policy');

            // Log policy switch to terminal
            appendTerminalLine(`-- Cambió política activa a: ${activePolicyKey.toUpperCase()}`, 'system');
        });
    });

    const appendTerminalLine = (text, type = 'system') => {
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.innerHTML = text;
        simTerminal.appendChild(line);
        simTerminal.scrollTop = simTerminal.scrollHeight;
    };

    btnRunSim.addEventListener('click', () => {
        const authUid = simAuthUid.value;
        const resourceOwner = simResourceOwner.value;

        appendTerminalLine(`\n-- Iniciando evaluación RLS en transacción [db_eval_${Math.floor(Math.random()*1000)}]`, 'system');
        
        setTimeout(() => {
            if (activePolicyKey === 'profiles_select') {
                appendTerminalLine(`SELECT * FROM public.profiles WHERE id = '${resourceOwner === 'user_juan' ? 'juan-9081' : 'maria-4001'}';`, 'query');
                
                setTimeout(() => {
                    // Juan queries Juan -> ALLOW
                    // Maria queries Maria -> ALLOW
                    // Operator queries anyone -> ALLOW (Operator bypasses via service role)
                    if (authUid === 'user_operator') {
                        appendTerminalLine(`[OK] BYPASS: Rol 'service_role' (Operador) tiene permisos globales en public.profiles.`, 'result allow');
                    } else if (authUid === resourceOwner) {
                        appendTerminalLine(`[OK] ALLOWED: auth.uid() ('${authUid === 'user_juan' ? 'juan-9081' : 'maria-4001'}') coincide con fila id.`, 'result allow');
                    } else {
                        appendTerminalLine(`[ERROR] DENIED: RLS Policy 'profiles_select' rechazó la fila. auth.uid() != id.`, 'result block');
                    }
                }, 500);
            } 
            else if (activePolicyKey === 'packages_select') {
                appendTerminalLine(`SELECT * FROM public.packages WHERE user_id = '${resourceOwner === 'user_juan' ? 'juan-9081' : 'maria-4001'}';`, 'query');
                
                setTimeout(() => {
                    if (authUid === 'user_operator') {
                        appendTerminalLine(`[OK] BYPASS: Rol 'service_role' (Operador) tiene fletes lectura/escritura en public.packages.`, 'result allow');
                    } else if (authUid === resourceOwner) {
                        appendTerminalLine(`[OK] ALLOWED: auth.uid() coincide con user_id. Acceso a paquete BZ-506 concedido.`, 'result allow');
                    } else {
                        appendTerminalLine(`[ERROR] FORBIDDEN: 403 Access Denied. auth.uid() no coincide con user_id de flete.`, 'result block');
                    }
                }, 500);
            }
            else if (activePolicyKey === 'invoices_select') {
                appendTerminalLine(`SELECT * FROM public.invoices WHERE package_id IN (SELECT id FROM public.packages WHERE user_id = '${resourceOwner === 'user_juan' ? 'juan-9081' : 'maria-4001'}');`, 'query');
                
                setTimeout(() => {
                    if (authUid === 'user_operator') {
                        appendTerminalLine(`[OK] BYPASS: Rol 'service_role' lee facturas e impuestos CIF de fletes.`, 'result allow');
                    } else if (authUid === resourceOwner) {
                        appendTerminalLine(`[OK] ALLOWED: Transacción exitosa. Fila invoice autorizada por RLS subquery.`, 'result allow');
                    } else {
                        appendTerminalLine(`[ERROR] FORBIDDEN: RLS policy subquery falló. No tienes permisos en el flete asociado.`, 'result block');
                    }
                }, 500);
            }
        }, 300);
    });


    // 5. TRACKING LOGIC STATE MACHINE DETAILS POPULATOR
    const trackNodes = document.querySelectorAll('.track-node');
    const stateTitle = document.getElementById('active-state-title');
    const stateTriggers = document.getElementById('active-state-triggers');
    const stateCalculations = document.getElementById('active-state-calculations');
    const stateNext = document.getElementById('active-state-next');

    const stateMetadata = {
        prealerted: {
            title: 'Prealertado',
            triggers: 'Inserta fila en <code>pre_alerts</code> y crea registro inicial en <code>packages</code> con status <code>\'prealerted\'</code>. El peso se inicializa en <code>0.00 lbs</code>.',
            calculations: 'No hay cálculos tarifarios. Se lee el archivo Invoice (PDF/Imagen) y se almacena en el bucket de Supabase para pre-clasificación aduanal.',
            next: 'El paquete debe ser recibido físicamente en nuestras bodegas de Florida para actualizar su peso y pasar al estado <strong>Listo en Miami</strong>.'
        },
        miami: {
            title: 'Listo en Miami (Bodegaje)',
            triggers: 'Modifica <code>packages.status</code> a <code>\'miami\'</code> e inserta primer log en <code>tracking_events</code>. Se registra el peso físico oficial.',
            calculations: 'Se calcula la tarifa aérea flete: mayor entre el peso real y volumen chargeable: <code>(Alto * Ancho * Largo) / 166</code>. Flete base = <code>peso * $4.95</code>.',
            next: 'El paquete se asocia a un manifiesto consolidado de vuelo y se embarca para pasar a <strong>En Tránsito</strong>.'
        },
        transit: {
            title: 'En Tránsito Aéreo',
            triggers: 'Modifica status a <code>\'transit\'</code> y escribe el manifiesto consolidado en <code>tracking_events</code> (Vuelo directo de carga BZ-730 SJO).',
            calculations: 'Sin cargos adicionales. Se fija tipo de cambio de referencia para colones: 1 USD = 515 CRC.',
            next: 'El vuelo arriba a aduanas aéreas del Aeropuerto Juan Santamaría de Costa Rica para pasar a <strong>Aduana CR</strong>.'
        },
        customs: {
            title: 'Proceso de Aduana Costa Rica',
            triggers: 'Modifica status a <code>\'customs\'</code> y dispara una subquery a <code>invoices</code>. Genera alerta en <code>notifications</code>.',
            calculations: 'Cálculo CIF Hacienda Costa Rica: <code>FOB + Flete + 1.50 Seguro</code>. Aplica ratios arancelarios: <strong>13% IVA</strong> (tecnología), <strong>54.55%</strong> (cosméticos), o <strong>29.95%</strong> (general).',
            next: 'Al liberarse el aforo fiscal por el sistema digital TICA, el flete se consolida en la bodega local y pasa a <strong>En Reparto</strong>.'
        },
        delivery: {
            title: 'En Reparto Local',
            triggers: 'Modifica status a <code>\'delivery\'</code>, asigna chofer local de ruta y activa el Websocket dinámico en <code>tracking_events</code>.',
            calculations: 'Publicación de coordenadas GPS dinámicas en tiempo real (longitud, latitud) en la consola del tracker, calculando el ETA estimado del camión.',
            next: 'El transportista llega a la dirección SJO registrada del cliente para pasar al estado final <strong>Entregado</strong>.'
        },
        delivered: {
            title: 'Entregado (Conformidad)',
            triggers: 'Estado final. Modifica status a <code>\'delivered\'</code> y bloquea la fila del flete en <code>packages</code> contra futuras modificaciones.',
            calculations: 'Valida token de firma de entrega del chofer y finaliza el ciclo transaccional logístico.',
            next: 'Ciclo completo terminado correctamente.'
        }
    };

    trackNodes.forEach(node => {
        node.addEventListener('click', () => {
            trackNodes.forEach(n => n.classList.remove('active'));
            node.classList.add('active');

            const stateKey = node.getAttribute('data-state');
            const meta = stateMetadata[stateKey];
            if (meta) {
                stateTitle.textContent = meta.title;
                stateTriggers.innerHTML = meta.triggers;
                stateCalculations.innerHTML = meta.calculations;
                stateNext.innerHTML = meta.next;
            }
        });
    });

})();

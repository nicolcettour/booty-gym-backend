window.GymApp = window.GymApp || {};

window.GymApp.pagos = {

    apiBase: 'https://booty-gym-backend-1.onrender.com',

    obtenerTokenAdmin: function() {
        return localStorage.getItem('admin_token');
    },

    headersAdmin: function() {
        const token = this.obtenerTokenAdmin();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`
        };
    },
    renderizarInterfaz: function() {
        const main = document.getElementById('app');
        if (!main) return;

        const usuarioActual = localStorage.getItem('admin_user');
        const esAdminPrincipal = (usuarioActual === 'Priscila.admin');

        main.innerHTML = `
            ${window.GymApp.renderLogo()}
            <div style="max-width: 650px; margin: 0 auto; background: rgba(20,20,20,0.85); padding: 20px; border-radius: 15px; border: 1px solid #333; color: white;">
                <h2 style="text-align: center; color: #ff9a8b; margin-top: 0;">CONTROL DE PAGOS</h2>
                
                <!-- Caja Chica del Día Desplegable -->
                <div style="background: rgba(255,255,255,0.05); border: 1px solid #ff9a8b; border-radius: 10px; padding: 12px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.GymApp.pagos.toggleCajaChica()">
                        <span style="font-weight: bold; color: #ff9a8b;">📦 Caja Chica del Día</span>
                        <div>
                            <button onclick="event.stopPropagation(); window.GymApp.pagos.realizarCierreCaja()" style="background: #ff9a8b; color: black; border: none; padding: 5px 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.9em; margin-right: 8px;">Cierre / PDF</button>
                            <button id="btn-toggle-caja" style="background: #333; color: #ff9a8b; border: 1px solid #ff9a8b; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85em;">🔽 Ver</button>
                        </div>
                    </div>
                    <div id="caja-chica-contenido" style="display: none; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <p style="color:#aaa; text-align:center; margin:5px 0;">Cargando movimientos...</p>
                    </div>
                </div>

                ${esAdminPrincipal ? `
                <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:15px; flex-wrap:wrap;">
                    <button onclick="window.GymApp.pagos.verHistorial()" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:bold; flex:1; min-width:150px;">Ver Historial de Pagos</button>
                    <button onclick="window.GymApp.pagos.verDeudas()" style="background:#333; color:#ff4757; border:1px solid #ff4757; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:bold; flex:1; min-width:110px;">💳 Deudas</button>
                    <button onclick="window.GymApp.cambiarVista('CONFIG')" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:bold; flex:1; min-width:120px;">Configuración</button>
                </div>` : ''}

                <div id="resumen-financiero" style="margin-bottom: 15px;"></div>
                
                <!-- Buscador de Clientas -->
                <div style="margin-bottom: 15px;">
                    <input type="text" id="buscador-pagos" placeholder="🔍 Buscar clienta por nombre o apellido..." 
                        oninput="window.GymApp.pagos.filtrarLista()" 
                        style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #444; background: rgba(255,255,255,0.07); color: white; font-size: 0.95em; outline: none; box-sizing: border-box;"
                        onfocus="this.style.borderColor='#ff9a8b'" onblur="this.style.borderColor='#444'">
                </div>

                <ul id="ul-pagos" style="list-style: none; padding: 0; max-height: 400px; overflow-y: auto;">
                    <p style="text-align:center; color:#aaa;">Cargando clientas...</p>
                </ul>
            </div>
        `;

        this.actualizarLista();
    },

    toggleCajaChica: function() {
        const contenido = document.getElementById('caja-chica-contenido');
        const boton = document.getElementById('btn-toggle-caja');
        
        if (!contenido) return;

        if (contenido.style.display === 'none') {
            contenido.style.display = 'block';
            if (boton) boton.textContent = '🔼 Ocultar';
            this.cargarCajaChicaDia();
        } else {
            contenido.style.display = 'none';
            if (boton) boton.textContent = '🔽 Ver';
        }
    },

    cargarCajaChicaDia: async function() {
        const contenido = document.getElementById('caja-chica-contenido');
        if (!contenido) return;

        try {
            const gymId = localStorage.getItem('gym_id');
            const usuarioActual = localStorage.getItem('admin_user') || 'default';
            const claveCierre = `caja_cerrada_ts_${gymId || 'general'}_global`;
            
            const url = `${this.apiBase}/pagos`;
            const res = await fetch(url, { headers: this.headersAdmin() });
            if (!res.ok) {
                contenido.style.display = 'block';
                contenido.innerHTML = '<p style="color:#ff4757; text-align:center; margin:5px 0;">Error al cargar movimientos.</p>';
                return;
            }

            const todosLosPagos = await res.json();
            
            const ahoraLoc = new Date();
            const anioL = ahoraLoc.getFullYear();
            const mesL = String(ahoraLoc.getMonth() + 1).padStart(2, '0');
            const diaL = String(ahoraLoc.getDate()).padStart(2, '0');
            const hoyStrLocal = `${anioL}-${mesL}-${diaL}`;

            const ultimoCierre = Number(localStorage.getItem(claveCierre) || 0);

            const movimientos = todosLosPagos.filter(m => {
                const fechaBruta = m.fecha_pago || m.created_at;
                if (!fechaBruta) return false;
                
                const fechaMov = new Date(fechaBruta);
                const fAnio = fechaMov.getFullYear();
                const fMes = String(fechaMov.getMonth() + 1).padStart(2, '0');
                const fDia = String(fechaMov.getDate()).padStart(2, '0');
                const fechaMovStrLocal = `${fAnio}-${fMes}-${fDia}`;
                
                return fechaMovStrLocal === hoyStrLocal && (fechaMov.getTime() >= ultimoCierre);
            });
            
            if (movimientos.length === 0) {
                contenido.innerHTML = '<p style="color:#aaa; text-align:center; margin:5px 0;">No hay movimientos nuevos hoy (Caja en $0.00).</p>';
                return;
            }

            let totalDia = 0;
            let htmlMovimientos = '<ul style="list-style: none; padding: 0; margin: 0; max-height: 150px; overflow-y: auto;">';

            movimientos.forEach(m => {
                const montoNum = Number(m.monto) || 0;
                totalDia += montoNum;
                const fechaP = new Date(m.fecha_pago || m.created_at);
                const horaStr = fechaP.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                const usuarioReg = m.usuario_registro && m.usuario_registro !== 'Admin' ? m.usuario_registro : usuarioActual;

                htmlMovimientos += `
                    <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9em;">
                        <span>${horaStr} - ${m.nombre_completo || 'Clienta'} <small style="color:#aaa">(${usuarioReg})</small></span>
                        <span style="color: #4caf50; font-weight: bold;">$${montoNum.toFixed(2)}</span>
                    </li>
                `;
            });

            htmlMovimientos += '</ul>';
            htmlMovimientos += `
                <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold;">
                    <span>Total del Día:</span>
                    <span style="color: #4caf50;">$${totalDia.toFixed(2)}</span>
                </div>
            `;

            contenido.innerHTML = htmlMovimientos;
        } catch (e) {
            console.error("Error al cargar caja chica:", e);
            contenido.innerHTML = '<p style="color:#ff4757; text-align:center; margin:5px 0;">Error de red al cargar caja.</p>';
        }
    },

    obtenerFrecuenciaSemanal: function(c) {
        let cant = 2;
        if (Array.isArray(c.dias)) {
            cant = c.dias.length;
        } else if (typeof c.dias === 'string' && c.dias.trim() !== '') {
            cant = c.dias.split(',').length;
        } else if (typeof c.dias === 'number') {
            cant = c.dias;
        } else if (typeof c.dias_asistencia === 'number') {
            cant = c.dias_asistencia;
        } else if (typeof c.dias_asistencia === 'string' && c.dias_asistencia.trim() !== '') {
            cant = c.dias_asistencia.split(',').length;
        }
        
        if (cant > 5) cant = 5;
        if (cant < 2) cant = 2;
        return cant;
    },

    obtenerMontoBasePorClienta: function(c, configPagos) {
        let cantDias = this.obtenerFrecuenciaSemanal(c);
        if (cantDias === 5) return Number(configPagos.monto5dias);
        if (cantDias === 4) return Number(configPagos.monto4dias);
        if (cantDias === 3) return Number(configPagos.monto3dias);
        return Number(configPagos.monto2dias);
    },

    actualizarLista: async function() {
        const ul = document.getElementById('ul-pagos');
        const divResumen = document.getElementById('resumen-financiero');
        if (!ul) return;

        try {
            const gymId = localStorage.getItem('gym_id') || 'BOOTY_GYM_001';
            const urlClientas = `${this.apiBase}/clientas`;
            const resClientas = await fetch(urlClientas, { headers: this.headersAdmin() });
            if (resClientas.ok) {
                window.GymApp.config.clientas = await resClientas.json();
            }

            const urlPagos = `${this.apiBase}/pagos`;
            const resPagos = await fetch(urlPagos, { headers: this.headersAdmin() });
            window.GymApp.pagosMesActual = resPagos.ok ? await resPagos.json() : [];

            const urlConfig = `${this.apiBase}/config`;
            const resConfig = await fetch(urlConfig, { headers: this.headersAdmin() });
            if (resConfig.ok) {
                const dataConfig = await resConfig.json();
                console.log("Datos de config recibidos del backend:", dataConfig);
                
                const cuotaGeneral = Number(dataConfig.monto_cuota || 0);

                window.GymApp.config.pagosConfig = {
                    monto2dias: Number(dataConfig.monto_2dias) || cuotaGeneral || 0,
                    monto3dias: Number(dataConfig.monto_3dias) || cuotaGeneral || 0,
                    monto4dias: Number(dataConfig.monto_4dias) || cuotaGeneral || 0,
                    monto5dias: Number(dataConfig.monto_5dias) || cuotaGeneral || 0,
                    interesPorcentaje: Number(dataConfig.interes || dataConfig.interesPorcentaje || 0)
                };
            }
        } catch (err) {
            console.error("Error al sincronizar con BD:", err);
        }

        const clientas = window.GymApp.config.clientas || [];

        clientas.sort((a, b) => {
            const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase();
            const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase();
            return nombreA.localeCompare(nombreB);
        });

        const pagosRegistrados = window.GymApp.pagosMesActual || [];
        const configPagos = window.GymApp.config.pagosConfig || { monto2dias: 0, monto3dias: 0, monto4dias: 0, monto5dias: 0, interesPorcentaje: 0 };
        
        const mesActual = new Date().getMonth() + 1;
        const anioActual = new Date().getFullYear();
        const diaActual = new Date().getDate();

        let totalCobrado = 0;
        let totalAdeudado = 0;

        ul.innerHTML = clientas.map((c, i) => {
            const pagoEncontrado = pagosRegistrados.find(p => {
                if (Number(p.clienta_id) !== Number(c.id)) return false;

                // El mes/anio guardado representa la cuota que se está abonando.
                // Esto es fundamental para poder registrar deudas de meses anteriores
                // sin marcarlas por error como la cuota del mes actual.
                if (p.mes != null && p.anio != null) {
                    return Number(p.mes) === mesActual && Number(p.anio) === anioActual;
                }

                if (p.fecha_pago) {
                    const fechaP = new Date(p.fecha_pago);
                    return (fechaP.getMonth() + 1) === mesActual && fechaP.getFullYear() === anioActual;
                }

                return false;
            });

            let montoBaseClienta = this.obtenerMontoBasePorClienta(c, configPagos);
            let frecuenciaSemanal = this.obtenerFrecuenciaSemanal(c);

            if (pagoEncontrado) {
                totalCobrado += Number(pagoEncontrado.monto || montoBaseClienta);

                const fechaPago = pagoEncontrado.fecha_pago
                    ? new Date(pagoEncontrado.fecha_pago).toLocaleDateString('es-AR')
                    : '';

                const medioPago =
                    (pagoEncontrado.medio_pago || '').toLowerCase().includes('mercado')
                        ? 'MP'
                        : '';

                const origenPago =
                    pagoEncontrado.origen === 'APP_SOCIAS'
                        ? 'App Socias'
                        : '';

                const detallePago = [fechaPago, medioPago, origenPago]
                    .filter(Boolean)
                    .join(' · ');

                return `<li data-nombre="${c.nombre.toLowerCase()} ${c.apellido.toLowerCase()}" style="padding:12px 0; border-bottom:1px solid #444; color: #fff;">
                            ${c.nombre} ${c.apellido} (${frecuenciaSemanal} días): <span style="color:#4caf50; font-weight:bold;">$${pagoEncontrado.monto || montoBaseClienta} ✅ Pagado</span>${detallePago ? ` · ${detallePago}` : ''}
                        </li>`;
            } else {
                let interesDecimal = Number(configPagos.interesPorcentaje || 0) / 100;
                let montoConInteresClienta = montoBaseClienta + (montoBaseClienta * interesDecimal);
                let montoAPagar = (diaActual > 10) ? montoConInteresClienta : montoBaseClienta;
                totalAdeudado += montoAPagar;

                return `<li data-nombre="${c.nombre.toLowerCase()} ${c.apellido.toLowerCase()}" style="padding:12px 0; border-bottom:1px solid #444; display:flex; justify-content:space-between; align-items: center; color: #ff4757; font-weight:bold;">
                            <span>${c.nombre} ${c.apellido} (${frecuenciaSemanal} días): $${Math.round(montoAPagar)}</span>
                            <button id="btn-pagar-${c.id}" onclick="window.GymApp.pagos.registrar(${i}, ${Math.round(montoAPagar)}, this)" style="background: linear-gradient(to right, #ff9a8b, #ff6a88); color: black; border: none; padding: 5px 15px; border-radius: 15px; font-weight: bold; cursor: pointer;">Registrar</button>
                        </li>`;
            }
        }).join('');

        if (divResumen) {
            const usuarioActual = localStorage.getItem('admin_user');
            if (usuarioActual === 'Priscila.admin') {
                divResumen.innerHTML = `
                    <div style="display:flex; justify-content:space-around;">
                        <p><strong>Total Cobrado:</strong> <span style="color:#4caf50; font-size:1.2em;">$${totalCobrado}</span></p>
                        <p><strong>Total Adeudado:</strong> <span style="color:#ff4757; font-size:1.2em;">$${Math.round(totalAdeudado)}</span></p>
                    </div>`;
            }
        }
        
        this.filtrarLista();
    },

    filtrarLista: function() {
        const input = document.getElementById('buscador-pagos');
        const ul = document.getElementById('ul-pagos');
        if (!input || !ul) return;

        const filtro = input.value.toLowerCase().trim();
        const items = ul.getElementsByTagName('li');

        for (let i = 0; i < items.length; i++) {
            const nombreCompleto = items[i].getAttribute('data-nombre') || '';
            if (nombreCompleto.includes(filtro)) {
                items[i].style.display = "";
            } else {
                items[i].style.display = "none";
            }
        }
    },

    registrar: async function(i, monto, botonElement) {
        const clienta = window.GymApp.config.clientas[i];
        const gymId = localStorage.getItem('gym_id');
        const usuarioActual = localStorage.getItem('admin_user') || 'Usuario';
        
        if (botonElement) {
            botonElement.disabled = true;
            botonElement.innerText = "Registrando...";
            botonElement.style.opacity = "0.5";
            botonElement.style.cursor = "not-allowed";
        }

        try {
            const cuerpoPeticion = {
                clienta_id: clienta.id,
                monto: monto,
                mes: new Date().getMonth() + 1,
                anio: new Date().getFullYear(),
                nombre_completo: `${clienta.nombre} ${clienta.apellido}`,
                usuario_registro: usuarioActual
            };

            const response = `${this.apiBase}/pagos`;
            const res = await fetch(response, {
                method: 'POST',
                headers: this.headersAdmin(),
                body: JSON.stringify(cuerpoPeticion)
            });

            if (res.ok) {
                alert("Pago registrado exitosamente");
                this.actualizarLista();
                const contenido = document.getElementById('caja-chica-contenido');
                if (contenido && contenido.style.display === 'block') {
                    this.cargarCajaChicaDia();
                }
            } else {
                const textoRespuesta = await res.text();
                alert(`Error del servidor: ${textoRespuesta}`);
                if (botonElement) {
                    botonElement.disabled = false;
                    botonElement.innerText = "Registrar";
                    botonElement.style.opacity = "1";
                    botonElement.style.cursor = "pointer";
                }
            }
        } catch (e) {
            console.error("Error de red:", e);
            alert("No se pudo conectar con el servidor.");
            if (botonElement) {
                botonElement.disabled = false;
                botonElement.innerText = "Registrar";
                botonElement.style.opacity = "1";
                botonElement.style.cursor = "pointer";
            }
        }
    },

    obtenerPeriodoPago: function(pago) {
        if (pago && pago.mes != null && pago.anio != null) {
            return {
                mes: Number(pago.mes),
                anio: Number(pago.anio)
            };
        }

        const fecha = pago && (pago.fecha_pago || pago.created_at);
        if (!fecha) return null;

        const f = new Date(fecha);
        if (Number.isNaN(f.getTime())) return null;

        return {
            mes: f.getMonth() + 1,
            anio: f.getFullYear()
        };
    },

    obtenerPrimerPeriodoDeuda: function(clienta, pagosClienta, hoy) {
        // Si la base ya posee fecha de alta/creación, esa es la referencia más segura.
        const fechaAltaBruta = clienta.fecha_alta || clienta.created_at || clienta.fecha_registro || clienta.fecha_ingreso;
        if (fechaAltaBruta) {
            const fechaAlta = new Date(fechaAltaBruta);
            if (!Number.isNaN(fechaAlta.getTime())) {
                return {
                    mes: fechaAlta.getMonth() + 1,
                    anio: fechaAlta.getFullYear()
                };
            }
        }

        // Para clientas antiguas sin fecha de alta, usamos el primer período de pago
        // conocido. Así evitamos inventar deudas anteriores a la información real del sistema.
        const periodos = pagosClienta
            .map(p => this.obtenerPeriodoPago(p))
            .filter(Boolean)
            .sort((a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes));

        if (periodos.length > 0) return periodos[0];

        // Si nunca tuvo un pago registrado y no existe fecha de alta,
        // empezamos en el mes actual para no generar deuda histórica ficticia.
        return {
            mes: hoy.getMonth() + 1,
            anio: hoy.getFullYear()
        };
    },

    calcularDeudas: function(clientas, pagosRegistrados, configPagos) {
        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const anioActual = hoy.getFullYear();
        const diaActual = hoy.getDate();
        const interesDecimal = Number(configPagos.interesPorcentaje || 0) / 100;
        const deudas = [];

        clientas.forEach(clienta => {
            const pagosClienta = pagosRegistrados.filter(p => Number(p.clienta_id) === Number(clienta.id));
            const pagados = new Set();

            pagosClienta.forEach(p => {
                const periodo = this.obtenerPeriodoPago(p);
                if (periodo) pagados.add(`${periodo.anio}-${periodo.mes}`);
            });

            const inicio = this.obtenerPrimerPeriodoDeuda(clienta, pagosClienta, hoy);
            let cursorAnio = inicio.anio;
            let cursorMes = inicio.mes;
            let guard = 0;

            while ((cursorAnio < anioActual || (cursorAnio === anioActual && cursorMes <= mesActual)) && guard < 240) {
                const clave = `${cursorAnio}-${cursorMes}`;

                if (!pagados.has(clave)) {
                    const montoBase = this.obtenerMontoBasePorClienta(clienta, configPagos);
                    const esMesActual = cursorAnio === anioActual && cursorMes === mesActual;
                    // Conservamos la regla que ya usa Booty Gym: luego del día 10 se aplica interés.
                    const aplicaInteres = !esMesActual || diaActual > 10;
                    const monto = aplicaInteres
                        ? montoBase + (montoBase * interesDecimal)
                        : montoBase;

                    deudas.push({
                        clienta,
                        mes: cursorMes,
                        anio: cursorAnio,
                        monto: Math.round(monto),
                        montoBase: Math.round(montoBase),
                        frecuencia: this.obtenerFrecuenciaSemanal(clienta)
                    });
                }

                cursorMes += 1;
                if (cursorMes > 12) {
                    cursorMes = 1;
                    cursorAnio += 1;
                }
                guard += 1;
            }
        });

        return deudas.sort((a, b) => {
            const periodoA = a.anio * 12 + a.mes;
            const periodoB = b.anio * 12 + b.mes;
            if (periodoA !== periodoB) return periodoA - periodoB;
            return `${a.clienta.nombre} ${a.clienta.apellido}`.localeCompare(`${b.clienta.nombre} ${b.clienta.apellido}`, 'es');
        });
    },

    verDeudas: async function() {
        const usuarioActual = localStorage.getItem('admin_user');
        if (usuarioActual !== 'Priscila.admin') return;

        const main = document.getElementById('app');
        if (!main) return;

        main.innerHTML = `
            ${window.GymApp.renderLogo()}
            <div style="max-width:760px; margin:0 auto; background:rgba(20,20,20,0.85); padding:20px; border-radius:15px; border:1px solid #333; color:white;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:15px;">
                    <button onclick="window.GymApp.cambiarVista('PAGOS')" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:8px; cursor:pointer;">← Volver</button>
                    <h2 style="color:#ff4757; margin:0; text-align:center; flex:1;">DEUDAS</h2>
                </div>
                <div id="deudas-resumen" style="margin-bottom:15px;"></div>
                <input type="text" id="buscador-deudas" placeholder="🔍 Buscar clienta..." oninput="window.GymApp.pagos.filtrarDeudas()" style="width:100%; padding:10px 14px; border-radius:8px; border:1px solid #444; background:rgba(255,255,255,0.07); color:white; font-size:0.95em; outline:none; box-sizing:border-box; margin-bottom:15px;">
                <div id="lista-deudas"><p style="text-align:center; color:#aaa;">Calculando deudas...</p></div>
            </div>
        `;

        try {
            const gymId = localStorage.getItem('gym_id') || 'BOOTY_GYM_001';
            const [resClientas, resPagos, resConfig] = await Promise.all([
                fetch(`${this.apiBase}/clientas`, { headers: this.headersAdmin() }),
                fetch(`${this.apiBase}/pagos`, { headers: this.headersAdmin() }),
                fetch(`${this.apiBase}/config`, { headers: this.headersAdmin() })
            ]);

            if (!resClientas.ok || !resPagos.ok || !resConfig.ok) {
                throw new Error('No fue posible obtener toda la información de pagos.');
            }

            const clientas = await resClientas.json();
            const pagos = await resPagos.json();
            const dataConfig = await resConfig.json();
            const cuotaGeneral = Number(dataConfig.monto_cuota || 0);
            const configPagos = {
                monto2dias: Number(dataConfig.monto_2dias) || cuotaGeneral || 0,
                monto3dias: Number(dataConfig.monto_3dias) || cuotaGeneral || 0,
                monto4dias: Number(dataConfig.monto_4dias) || cuotaGeneral || 0,
                monto5dias: Number(dataConfig.monto_5dias) || cuotaGeneral || 0,
                interesPorcentaje: Number(dataConfig.interes || dataConfig.interesPorcentaje || 0)
            };

            window.GymApp.deudasCalculadas = this.calcularDeudas(clientas, pagos, configPagos);
            this.renderizarDeudas();
        } catch (e) {
            console.error('Error al calcular deudas:', e);
            const lista = document.getElementById('lista-deudas');
            if (lista) lista.innerHTML = '<p style="color:#ff4757; text-align:center;">No se pudieron cargar las deudas.</p>';
        }
    },

    renderizarDeudas: function() {
        const lista = document.getElementById('lista-deudas');
        const resumen = document.getElementById('deudas-resumen');
        if (!lista) return;

        const deudas = window.GymApp.deudasCalculadas || [];
        const nombresMeses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const total = deudas.reduce((acc, d) => acc + Number(d.monto || 0), 0);
        const clientasConDeuda = new Set(deudas.map(d => d.clienta.id)).size;

        if (resumen) {
            resumen.innerHTML = `
                <div style="display:flex; justify-content:space-around; gap:10px; flex-wrap:wrap; background:rgba(255,71,87,0.08); border:1px solid rgba(255,71,87,0.4); padding:12px; border-radius:10px;">
                    <span><strong>Clientas con deuda:</strong> ${clientasConDeuda}</span>
                    <span><strong>Cuotas pendientes:</strong> ${deudas.length}</span>
                    <span><strong>Total adeudado:</strong> <span style="color:#ff4757;">$${Math.round(total)}</span></span>
                </div>`;
        }

        if (deudas.length === 0) {
            lista.innerHTML = '<p style="color:#4caf50; text-align:center; padding:20px;">✅ No hay cuotas pendientes registradas.</p>';
            return;
        }

        const agrupadas = {};
        deudas.forEach(d => {
            const id = d.clienta.id;
            if (!agrupadas[id]) {
                agrupadas[id] = {
                    clienta: d.clienta,
                    frecuencia: d.frecuencia,
                    items: []
                };
            }
            agrupadas[id].items.push(d);
        });

        lista.innerHTML = Object.values(agrupadas).map(grupo => {
            const nombre = `${grupo.clienta.nombre} ${grupo.clienta.apellido}`;
            const totalClienta = grupo.items.reduce((acc, d) => acc + Number(d.monto || 0), 0);
            const detalle = grupo.items.map(d => `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:9px 0; border-top:1px solid rgba(255,255,255,0.08);">
                    <span style="flex:1;">${nombresMeses[d.mes - 1]} ${d.anio}</span>
                    <strong style="color:#ff4757;">$${d.monto}</strong>
                    <button onclick="window.GymApp.pagos.registrarDeuda(${grupo.clienta.id}, ${d.mes}, ${d.anio}, ${d.monto}, this)" style="background:#ff9a8b; color:black; border:none; padding:6px 12px; border-radius:14px; font-weight:bold; cursor:pointer;">Registrar pago</button>
                </div>
            `).join('');

            return `
                <div class="deuda-clienta" data-nombre="${nombre.toLowerCase()}" style="background:#222; border:1px solid #444; border-radius:10px; padding:12px 14px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                        <div><strong>${nombre}</strong> <span style="color:#aaa; font-size:0.9em;">(${grupo.frecuencia} días)</span></div>
                        <div style="text-align:right;"><span style="color:#aaa; font-size:0.85em;">${grupo.items.length} cuota${grupo.items.length === 1 ? '' : 's'}</span><br><strong style="color:#ff4757;">$${Math.round(totalClienta)}</strong></div>
                    </div>
                    ${detalle}
                </div>`;
        }).join('');
    },

    filtrarDeudas: function() {
        const input = document.getElementById('buscador-deudas');
        if (!input) return;
        const filtro = input.value.toLowerCase().trim();
        document.querySelectorAll('.deuda-clienta').forEach(item => {
            const nombre = item.getAttribute('data-nombre') || '';
            item.style.display = nombre.includes(filtro) ? '' : 'none';
        });
    },

    registrarDeuda: async function(clientaId, mes, anio, monto, botonElement) {
        const deudas = window.GymApp.deudasCalculadas || [];
        const deuda = deudas.find(d => Number(d.clienta.id) === Number(clientaId) && Number(d.mes) === Number(mes) && Number(d.anio) === Number(anio));
        if (!deuda) {
            alert('No se encontró la deuda seleccionada. Actualizá la pantalla e intentá nuevamente.');
            return;
        }

        if (!confirm(`¿Registrar el pago de ${deuda.clienta.nombre} ${deuda.clienta.apellido} correspondiente a ${mes}/${anio} por $${monto}?`)) {
            return;
        }

        const gymId = localStorage.getItem('gym_id') || 'BOOTY_GYM_001';
        const usuarioActual = localStorage.getItem('admin_user') || 'Usuario';

        if (botonElement) {
            botonElement.disabled = true;
            botonElement.textContent = 'Registrando...';
            botonElement.style.opacity = '0.5';
        }

        try {
            const res = await fetch(`${this.apiBase}/pagos`, {
                method: 'POST',
                headers: this.headersAdmin(),
                body: JSON.stringify({
                    clienta_id: deuda.clienta.id,
                    monto: Number(monto),
                    mes: Number(mes),
                    anio: Number(anio),
                    nombre_completo: `${deuda.clienta.nombre} ${deuda.clienta.apellido}`,
                    usuario_registro: usuarioActual,
                    fecha_pago: new Date().toISOString()
                })
            });

            if (!res.ok) {
                const texto = await res.text();
                throw new Error(texto || 'Error al registrar el pago');
            }

            alert('Pago de deuda registrado exitosamente.');
            await this.verDeudas();
        } catch (e) {
            console.error('Error al registrar deuda:', e);
            alert('No se pudo registrar el pago de la deuda.');
            if (botonElement) {
                botonElement.disabled = false;
                botonElement.textContent = 'Registrar pago';
                botonElement.style.opacity = '1';
            }
        }
    },

    realizarCierreCaja: async function() {
        try {
            const gymId = localStorage.getItem('gym_id');
            let usuarioActual = localStorage.getItem('admin_user') || 'Administrador';
            const claveCierre = `caja_cerrada_ts_${gymId || 'general'}_global`;
            
            const url = `${this.apiBase}/pagos`;
            
            const res = await fetch(url, { headers: this.headersAdmin() });
            if (!res.ok) {
                alert("No se pudieron obtener los datos para el cierre de caja.");
                return;
            }

            const todosLosPagos = await res.json();
            
            const ahora = new Date();
            const anioL = ahora.getFullYear();
            const mesL = String(ahora.getMonth() + 1).padStart(2, '0');
            const diaL = String(ahora.getDate()).padStart(2, '0');
            const hoyStrLocal = `${anioL}-${mesL}-${diaL}`;

            const ultimoCierre = Number(localStorage.getItem(claveCierre) || 0);

            const movimientos = todosLosPagos.filter(m => {
                const fechaBruta = m.fecha_pago || m.created_at;
                if (!fechaBruta) return false;
                
                const fechaMov = new Date(fechaBruta);
                const fAnio = fechaMov.getFullYear();
                const fMes = String(fechaMov.getMonth() + 1).padStart(2, '0');
                const fDia = String(fechaMov.getDate()).padStart(2, '0');
                const fechaMovStrLocal = `${fAnio}-${fMes}-${fDia}`;
                
                return fechaMovStrLocal === hoyStrLocal && (fechaMov.getTime() >= ultimoCierre);
            });

            if (movimientos.length === 0) {
                alert("No hay nuevos pagos pendientes de cierre.");
                return;
            }

            let totalCaja = 0;
            let filasHTML = '';

            movimientos.forEach((m, index) => {
                const montoNum = Number(m.monto) || 0;
                totalCaja += montoNum;
                const fechaP = new Date(m.fecha_pago || m.created_at);
                const horaStr = fechaP.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                const cobradoPor = m.usuario_registro || usuarioActual;

                filasHTML += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${index + 1}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${m.nombre_completo || 'Clienta'}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${m.concepto || 'Cuota Mensual'}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${horaStr}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${cobradoPor}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: #2e7d32;">$${montoNum.toFixed(2)}</td>
                    </tr>
                `;
            });

            const fechaFormateada = `${diaL}/${mesL}/${anioL}`;
            const ventanaCierre = window.open('', '_blank', 'width=800,height=600');
            ventanaCierre.document.write(`
                <html>
                    <head>
                        <title>Cierre de Caja - ${fechaFormateada}</title>
                        <style>
                            body { font-family: Arial, sans-serif; color: #333; margin: 20px; }
                            h2 { text-align: center; color: #d81b60; margin-bottom: 5px; }
                            .info { margin-bottom: 20px; background: #f9f9f9; padding: 10px; border-radius: 5px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            th { background-color: #d81b60; color: white; padding: 10px; text-align: left; }
                            .total-box { margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold; background: #f1f8e9; padding: 10px; border-radius: 5px; }
                            .no-print { margin-top: 20px; text-align: center; }
                            .btn { background: #d81b60; color: white; border: none; padding: 10px 20px; font-size: 1em; border-radius: 5px; cursor: pointer; }
                            @media print { .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        <h2>BOOTY GYM - CIERRE DE CAJA DIARIO</h2>
                        <div class="info">
                            <p><strong>Fecha del Cierre:</strong> ${fechaFormateada}</p>
                            <p><strong>Caja Cerrada por:</strong> ${usuarioActual}</p>
                            <p><strong>Total de Transacciones:</strong> ${movimientos.length}</p>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="text-align: center;">#</th>
                                    <th>Clienta</th>
                                    <th style="text-align: center;">Concepto</th>
                                    <th style="text-align: center;">Hora</th>
                                    <th style="text-align: center;">Cobró</th>
                                    <th style="text-align: right;">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filasHTML}
                            </tbody>
                        </table>
                        <div class="total-box">
                            Total Acumulado en Caja: $${totalCaja.toFixed(2)}
                        </div>
                        <div class="no-print">
                            <button class="btn" onclick="window.print()">Guardar como PDF / Imprimir</button>
                        </div>
                    </body>
                </html>
            `);
            ventanaCierre.document.close();

            localStorage.setItem(claveCierre, Date.now());
            this.cargarCajaChicaDia();
        } catch (e) {
            console.error("Error al realizar el cierre de caja:", e);
            alert("Ocurrió un error al generar el cierre de caja.");
        }
    },

    verHistorial: async function() {
        const usuarioActual = localStorage.getItem('admin_user');
        if (usuarioActual !== 'Priscila.admin') {
            alert("No tienes permisos para ver el registro histórico.");
            window.GymApp.cambiarVista('PAGOS');
            return;
        }

        try {
            const gymId = localStorage.getItem('gym_id');
            const urlHistorial = `${this.apiBase}/pagos/agrupados`;
            const response = await fetch(urlHistorial, { headers: this.headersAdmin() });
            const data = await response.json();
            window.GymApp.tempData = data;

            const main = document.getElementById('app');
            const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            let html = `
                ${window.GymApp.renderLogo()}
                <div style="text-align:center;">
                    <button onclick="window.GymApp.cambiarVista('PAGOS')" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:5px; cursor:pointer; margin-bottom:20px;">← Volver</button>
                    <h2 style="color: #ff9a8b; margin-top:0;">REGISTRO HISTÓRICO</h2>
                </div>`;

            const años = [...new Set(data.map(p => p.anio))].sort((a, b) => b - a);
            
            años.forEach(anio => {
                const pagosAnio = data.filter(p => p.anio == anio);
                const totalAnual = pagosAnio.reduce((sum, p) => sum + Number(p.monto), 0);
                
                html += `
                <div style="background: rgba(20,20,20,0.85); padding: 20px; border-radius: 15px; border: 1px solid #333; margin-top:20px;">
                    <h3 style="color:#fff; margin-top:0;">Año ${anio}</h3>
                    <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; margin-bottom:15px; border-left: 4px solid #4caf50;">
                        <span><strong>Total Cobrado:</strong> $${totalAnual}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">`;
                
                nombresMeses.forEach((nombre, index) => {
                    const mesNum = index + 1;
                    html += `<button onclick="window.GymApp.pagos.mostrarDetalleMes('${anio}', ${mesNum}, '${nombre}')" 
                            style="padding:10px; background:#333; color:#ff9a8b; border:1px solid #ff9a8b; border-radius:5px; cursor:pointer; font-weight:bold;">
                            ${nombre}
                           </button>`;
                });
                html += `</div></div>`;
            });
            main.innerHTML = html;
        } catch (e) { console.error("Error al cargar historial:", e); }
    },

    mostrarDetalleMes: function(anio, mes, nombreMes) {
        const usuarioActual = localStorage.getItem('admin_user');
        if (usuarioActual !== 'Priscila.admin') return;

        const pagos = window.GymApp.tempData.filter(p => p.anio == anio && p.mes == mes);
        
        pagos.sort((a, b) => {
            const nombreA = (a.nombre_completo || "").toLowerCase();
            const nombreB = (b.nombre_completo || "").toLowerCase();
            return nombreA.localeCompare(nombreB);
        });

        const main = document.getElementById('app');
        
        let html = `
            ${window.GymApp.renderLogo()}
            <button onclick="window.GymApp.pagos.verHistorial()" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:5px; cursor:pointer; margin-bottom:20px;">← Volver al Historial</button>
            <h2 style="color:#ff9a8b;">${nombreMes} ${anio}</h2>`;
        
        if (pagos.length > 0) {
            const totalMes = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
            html += `
                <div style="background: rgba(255,255,255,0.05); padding:15px; border-radius:10px; margin-bottom:20px; text-align:center; border: 1px solid #4caf50;">
                    <h3 style="margin:0; color:#4caf50;">Total recaudado en ${nombreMes}: $${totalMes}</h3>
                </div>
                <ul style="list-style:none; padding:0;">`;
            
            pagos.forEach(p => {
                html += `<li style="background:#222; padding:10px; margin-bottom:5px; border-radius:5px; color:white; border-left:3px solid #ff9a8b;">
                            ${p.nombre_completo}: <span style="color:#4caf50;">$${p.monto}</span>
                       </li>`;
            });
            html += `</ul>`;
        } else {
            html += `<p style="color:#ff9a8b; text-align:center; margin-top:20px; padding:20px; border:1px dashed #ff9a8b; border-radius:10px;">No se registran pagos en este mes.</p>`;
        }
        main.innerHTML = html;
    },

   
      guardarConfig: async function() {
        const gymId = localStorage.getItem('gym_id') || 'BOOTY_GYM_001';
        
        const input2 = document.getElementById('in-monto-2dias');
        const input3 = document.getElementById('in-monto-3dias');
        const input4 = document.getElementById('in-monto-4dias');
        const input5 = document.getElementById('in-monto-5dias');
        const inputInteres = document.getElementById('in-interes');

        const datosConfig = {
            monto_2dias: input2 ? (Number(input2.value) || 0) : 0,
            monto_3dias: input3 ? (Number(input3.value) || 0) : 0,
            monto_4dias: input4 ? (Number(input4.value) || 0) : 0,
            monto_5dias: input5 ? (Number(input5.value) || 0) : 0,
            interes: inputInteres ? (Number(inputInteres.value) || 0) : 0
        };

        console.log("Enviando configuración:", datosConfig);

        try {
            const response = await fetch(`${this.apiBase}/config`, {
                method: 'POST',
                headers: this.headersAdmin(),
                body: JSON.stringify(datosConfig)
            });
            
            if (response.ok) {
                alert('Configuración guardada exitosamente');
                window.GymApp.cambiarVista('PAGOS');
            } else {
                alert('Error al guardar la configuración');
            }
        } catch (e) {
            console.error('Error:', e);
        }
    }
};
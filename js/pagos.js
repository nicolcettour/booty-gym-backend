window.GymApp = window.GymApp || {};

window.GymApp.pagos = {
    renderizarInterfaz: function() {
        const main = document.getElementById('app');
        if (!main) return;

        const usuarioActual = localStorage.getItem('admin_user');
        const esAdminPrincipal = (usuarioActual === 'Priscila.admin');

        main.innerHTML = `
            ${window.GymApp.renderLogo()}
            <div style="max-width: 650px; margin: 0 auto; background: rgba(20,20,20,0.85); padding: 20px; border-radius: 15px; border: 1px solid #333; color: white;">
                <h2 style="text-align: center; color: #ff9a8b; margin-top: 0;">CONTROL DE PAGOS</h2>
                
                <!-- Caja Chica del Día -->
                <div style="background: rgba(255,255,255,0.05); border: 1px solid #ff9a8b; border-radius: 10px; padding: 12px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: bold; color: #ff9a8b;">📦 Caja Chica del Día</span>
                        <button onclick="window.GymApp.pagos.realizarCierreCaja()" style="background: #ff9a8b; color: black; border: none; padding: 5px 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.9em;">Cierre de Caja / PDF</button>
                    </div>
                    <div id="caja-chica-contenido">
                        <p style="color:#aaa; text-align:center; margin:5px 0;">Cargando movimientos...</p>
                    </div>
                </div>

                ${esAdminPrincipal ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                    <button onclick="window.GymApp.pagos.verHistorial()" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:bold;">Ver Historial de Pagos</button>
                    <button onclick="window.GymApp.cambiarVista('CONFIG_PAGOS')" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:bold;">Configuración</button>
                </div>` : ''}

                <div id="resumen-financiero" style="margin-bottom: 15px;"></div>
                
                <ul id="ul-pagos" style="list-style: none; padding: 0; max-height: 400px; overflow-y: auto;">
                    <p style="text-align:center; color:#aaa;">Cargando clientas...</p>
                </ul>
            </div>
        `;

        this.actualizarLista();
        this.cargarCajaChicaDia();
    },

    cargarCajaChicaDia: async function() {
        const contenedorCaja = document.getElementById('caja-chica-contenido');
        if (!contenedorCaja) return;

        try {
            const gymId = localStorage.getItem('gym_id');
            const usuarioActual = localStorage.getItem('admin_user') || 'Desconocido';
            
            const base = 'https://booty-gym-backend.vercel.app';
            const url = gymId ? `${base}/caja-chica?gym_id=${gymId}` : `${base}/caja-chica`;
            const res = await fetch(url);
            
            if (!res.ok) {
                contenedorCaja.innerHTML = `<p style="color:#aaa; text-align:center; margin:5px 0;">Sin movimientos registrados hoy.</p>`;
                return;
            }

            const movimientos = await res.json();
            
            if (movimientos.length === 0) {
                contenedorCaja.innerHTML = `<p style="color:#aaa; text-align:center; margin:5px 0;">No hay cobros registrados en la caja chica hoy.</p>`;
                return;
            }

            let totalCajaDia = 0;
            let htmlMovs = `<ul style="list-style:none; padding:0; margin:0;">`;

            movimientos.forEach(m => {
                totalCajaDia += Number(m.monto);
                const horaStr = m.fecha_pago ? new Date(m.fecha_pago).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente';
                const cobradoPor = m.usuario_registro || usuarioActual;

                htmlMovs += `
                    <li style="padding:6px 0; border-bottom:1px dashed #444; display:flex; justify-content:space-between; align-items:center;">
                        <span>👤 <strong>${m.nombre_completo}</strong> <small style="color:#aaa;">(${horaStr} - Cobró: ${cobradoPor})</small></span>
                        <span style="color:#4caf50; font-weight:bold;">$${m.monto}</span>
                    </li>`;
            });

            htmlMovs += `</ul>
                <div style="margin-top:10px; padding-top:5px; border-top:1px solid #ff9a8b; display:flex; justify-content:space-between; font-weight:bold;">
                    <span>Total en Caja Chica Hoy:</span>
                    <span style="color:#4caf50; font-size:1.1em;">$${totalCajaDia}</span>
                </div>`;

            contenedorCaja.innerHTML = htmlMovs;

        } catch (e) {
            console.error("Error al cargar caja chica:", e);
            contenedorCaja.innerHTML = `<p style="color:#ff4757; text-align:center; margin:5px 0;">Error al sincronizar caja chica.</p>`;
        }
    },

    actualizarLista: async function() {
        const ul = document.getElementById('ul-pagos');
        const divResumen = document.getElementById('resumen-financiero');
        if (!ul) return;

        const base = 'https://booty-gym-backend.vercel.app';

        try {
            const gymId = localStorage.getItem('gym_id');
            const urlClientas = gymId ? `${base}/clientas?gym_id=${gymId}` : `${base}/clientas`;
            const resClientas = await fetch(urlClientas);
            if (resClientas.ok) {
                window.GymApp.config.clientas = await resClientas.json();
            }

            const urlPagos = gymId ? `${base}/pagos?gym_id=${gymId}` : `${base}/pagos`;
            const resPagos = await fetch(urlPagos);
            window.GymApp.pagosMesActual = resPagos.ok ? await resPagos.json() : [];

            const resConfig = await fetch(`${base}/config`);
            if (resConfig.ok) {
                const dataConfig = await resConfig.json();
                window.GymApp.config.pagosConfig = {
                    montoCuota: dataConfig.monto_cuota,
                    interesPorcentaje: dataConfig.interes
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
        const configPagos = window.GymApp.config.pagosConfig || { montoCuota: 0, interesPorcentaje: 0 };
        
        const mesActual = new Date().getMonth() + 1;
        const anioActual = new Date().getFullYear();
        const diaActual = new Date().getDate();

        let totalCobrado = 0;
        let totalAdeudado = 0;

        let montoBase = Number(configPagos.montoCuota);
        let montoConInteres = montoBase + (montoBase * (configPagos.interesPorcentaje / 100));

        ul.innerHTML = clientas.map((c, i) => {
            const pagoEncontrado = pagosRegistrados.find(p => {
                if (p.clienta_id !== c.id) return false;
                if (p.fecha_pago) {
                    const fechaP = new Date(p.fecha_pago);
                    return (fechaP.getMonth() + 1) === mesActual && fechaP.getFullYear() === anioActual;
                }
                return Number(p.mes) === mesActual && Number(p.anio) === anioActual;
            });

            if (pagoEncontrado) {
                totalCobrado += Number(pagoEncontrado.monto || montoBase);
                return `<li style="padding:12px 0; border-bottom:1px solid #444; color: #fff;">
                            ${c.nombre} ${c.apellido}: <span style="color:#4caf50; font-weight:bold;">$${pagoEncontrado.monto || montoBase} ✅ Pagado</span>
                        </li>`;
            } else {
                let montoAPagar = (diaActual > 10) ? montoConInteres : montoBase;
                totalAdeudado += montoAPagar;
                return `<li style="padding:12px 0; border-bottom:1px solid #444; display:flex; justify-content:space-between; align-items: center; color: #ff4757; font-weight:bold;">
                            <span>${c.nombre} ${c.apellido}: $${Math.round(montoAPagar)}</span>
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
    },

    registrar: async function(i, monto, botonElement) {
        const clienta = window.GymApp.config.clientas[i];
        const gymId = localStorage.getItem('gym_id');
        const usuarioActual = localStorage.getItem('admin_user') || 'Admin';
        
        if (botonElement) {
            botonElement.disabled = true;
            botonElement.innerText = "Registrando...";
            botonElement.style.opacity = "0.5";
            botonElement.style.cursor = "not-allowed";
        }

        try {
            const base = 'https://booty-gym-backend.vercel.app';
            const cuerpoPeticion = {
                gym_id: gymId,
                clienta_id: clienta.id,
                monto: monto,
                mes: new Date().getMonth() + 1,
                anio: new Date().getFullYear(),
                nombre_completo: `${clienta.nombre} ${clienta.apellido}`,
                usuario_registro: usuarioActual
            };

            const response = await fetch(`${base}/pagos`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(cuerpoPeticion)
            });

            if (response.ok) {
                alert("Pago registrado exitosamente en la caja chica");
                this.actualizarLista();
                this.cargarCajaChicaDia();
            } else {
                const textoRespuesta = await response.text();
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

    realizarCierreCaja: function() {
        const usuarioActual = localStorage.getItem('admin_user') || 'Usuario';
        const fechaHoy = new Date().toLocaleDateString();

        const ventanaCierre = window.open('', '_blank', 'width=600,height=600');
        ventanaCierre.document.write(`
            <html>
                <head>
                    <title>Cierre de Caja - ${fechaHoy}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                        h2 { text-align: center; color: #333; }
                        .info { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        button { padding: 10px 20px; background: #000; color: #fff; border: none; cursor: pointer; font-weight: bold; border-radius: 5px; display: block; margin: 20px auto; }
                        @media print { button { display: none; } }
                    </style>
                </head>
                <body>
                    <h2>CIERRE DE CAJA DIARIO</h2>
                    <div class="info">
                        <p><strong>Fecha:</strong> ${fechaHoy}</p>
                        <p><strong>Usuario / Empleada:</strong> ${usuarioActual}</p>
                    </div>
                    <div>
                        <h3>Resumen de Movimientos</h3>
                        <p>Generado correctamente desde el sistema de control de pagos.</p>
                    </div>
                    <button onclick="window.print()">Guardar como PDF / Imprimir</button>
                </body>
            </html>
        `);
        ventanaCierre.document.close();
    },

    verHistorial: async function() {
        const usuarioActual = localStorage.getItem('admin_user');
        if (usuarioActual !== 'Priscila.admin') {
            alert("No tienes permisos para ver el registro histórico.");
            window.GymApp.cambiarVista('PAGOS');
            return;
        }

        try {
            const base = 'https://booty-gym-backend.vercel.app';
            const gymId = localStorage.getItem('gym_id');
            const urlHistorial = gymId ? `${base}/pagos/agrupados?gym_id=${gymId}` : `${base}/pagos/agrupados`;
            const response = await fetch(urlHistorial);
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
        const monto = document.getElementById('in-monto').value;
        const interes = document.getElementById('in-interes').value;
        try {
            const base = 'https://booty-gym-backend.vercel.app';
            const response = await fetch(`${base}/config`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ montoCuota: monto, interesPorcentaje: interes })
            });
            if (response.ok) {
                window.GymApp.config.pagosConfig.montoCuota = monto;
                window.GymApp.config.pagosConfig.interesPorcentaje = interes;
                alert("Configuración guardada en el servidor");
                window.GymApp.cambiarVista('PAGOS');
            }
        } catch (e) {
            console.error("Error al guardar:", e);
            alert("No se pudo guardar la configuración");
        }
    }
};
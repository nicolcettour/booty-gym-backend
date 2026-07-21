window.GymApp = window.GymApp || {};

window.GymApp.pagos = {
    renderizarInterfaz: function() {
        const main = document.getElementById('app');
        main.innerHTML = `
            ${window.GymApp.renderLogo()}
            <h2 style="color: #ff9a8b; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Control de Pagos</h2>
            <div id="resumen-financiero" style="margin-bottom:20px; padding:15px; background: rgba(20,20,20,0.85); backdrop-filter: blur(8px); border-radius:10px; color: #fff; border: 1px solid #333;"></div>
            <div style="margin-bottom:10px;">
                <button onclick="window.GymApp.pagos.verHistorial()" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:5px; cursor:pointer;">Registro de Pagos</button>
                <button onclick="window.GymApp.cambiarVista('CONFIG')" style="background:#333; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:5px; cursor:pointer;">Configuración</button>
            </div>
            <div style="background: rgba(20,20,20,0.85); padding: 15px; border-radius: 15px; backdrop-filter: blur(8px); border: 1px solid #333;">
                <ul id="ul-pagos" style="list-style:none; padding:0; margin: 0;"></ul>
            </div>`;
        this.actualizarLista();
    },

    actualizarLista: async function() {
        const ul = document.getElementById('ul-pagos');
        const divResumen = document.getElementById('resumen-financiero');
        if (!ul || !divResumen) return;

        try {
            // Sincronizamos clientas incluyendo el gym_id si está disponible
            const gymId = localStorage.getItem('gym_id');
            const urlClientas = gymId ? `http://localhost:3000/clientas?gym_id=${gymId}` : 'http://localhost:3000/clientas';
            const resClientas = await fetch(urlClientas);
            if (resClientas.ok) {
                window.GymApp.config.clientas = await resClientas.json();
            }

            // Sincronizamos los pagos del mes corriente para saber quién ya pagó
            const resPagos = await fetch('http://localhost:3000/pagos');
            window.GymApp.pagosMesActual = resPagos.ok ? await resPagos.json() : [];

            // --- NUEVO: SINCRONIZAR CONFIGURACIÓN DESDE POSTGRESQL AL CARGAR VISTA DE PAGOS ---
            const resConfig = await fetch('http://localhost:3000/config');
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

        // --- ORDENAR ALFABÉTICAMENTE DE LA A A LA Z ---
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
            // Verificamos si esta clienta ya tiene un pago registrado en el mes y año actual
            const pagoEncontrado = pagosRegistrados.find(p => {
                const fechaP = new Date(p.fecha_pago);
                return p.clienta_id === c.id && 
                       (p.mes === mesActual || (fechaP.getMonth() + 1 === mesActual && fechaP.getFullYear() === anioActual));
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

        divResumen.innerHTML = `
            <div style="display:flex; justify-content:space-around;">
                <p><strong>Total Cobrado:</strong> <span style="color:#4caf50; font-size:1.2em;">$${totalCobrado}</span></p>
                <p><strong>Total Adeudado:</strong> <span style="color:#ff4757; font-size:1.2em;">$${Math.round(totalAdeudado)}</span></p>
            </div>`;
    },

    registrar: async function(i, monto, botonElement) {
        const clienta = window.GymApp.config.clientas[i];
        
        // Bloqueamos el botón inmediatamente para evitar múltiples clics
        if (botonElement) {
            botonElement.disabled = true;
            botonElement.innerText = "Registrando...";
            botonElement.style.opacity = "0.5";
            botonElement.style.cursor = "not-allowed";
        }

        try {
            const response = await fetch('http://localhost:3000/pagos', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    clienta_id: clienta.id,
                    monto: monto,
                    mes: new Date().getMonth() + 1,
                    anio: new Date().getFullYear(),
                    nombre_completo: `${clienta.nombre} ${clienta.apellido}`
                })
            });

            if (response.ok) {
                alert("Pago registrado exitosamente");
                this.actualizarLista(); // Refresca la lista y muestra el mes corriente actualizado
            } else {
                alert("Error al registrar el pago en el servidor.");
                if (botonElement) {
                    botonElement.disabled = false;
                    botonElement.innerText = "Registrar";
                    botonElement.style.opacity = "1";
                    botonElement.style.cursor = "pointer";
                }
            }
        } catch (e) {
            console.error("Error:", e);
            alert("No se pudo conectar con el servidor.");
            if (botonElement) {
                botonElement.disabled = false;
                botonElement.innerText = "Registrar";
                botonElement.style.opacity = "1";
                botonElement.style.cursor = "pointer";
            }
        }
    },

    verHistorial: async function() {
        try {
            const response = await fetch('http://localhost:3000/pagos/agrupados');
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
        const pagos = window.GymApp.tempData.filter(p => p.anio == anio && p.mes == mes);
        
        // --- ORDENAR ALFABÉTICAMENTE EL HISTORIAL DE LA A A LA Z ---
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
            const response = await fetch('http://localhost:3000/config', {
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
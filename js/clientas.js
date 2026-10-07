window.GymApp = window.GymApp || {};

window.GymApp.clientas = {

    mostrarBajas: false,
    listaCompleta: [],
    listaVisible: [],
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

    // Función auxiliar para asegurar que la altura se guarde/muestre con coma (ej: 1,65)
    formatearAltura: function(valor) {
        if (!valor) return '';

        let valStr = String(valor).trim().replace('.', ',');

        // Si ingresan por ejemplo 165 o 175 sin coma, lo auto-convertimos a 1,65 o 1,75
        if (!valStr.includes(',') && valStr.length === 3) {
            valStr = valStr[0] + ',' + valStr.slice(1);
        }

        return valStr;
    },

    // Nueva función para traer los datos reales de Postgres al iniciar
    cargarDesdeServidor: async function() {
        try {
            const res = await fetch(`${this.apiBase}/clientas?estado=todas`, {
                method: 'GET',
                headers: this.headersAdmin()
            });
            if (!res.ok) throw new Error(`Error ${res.status} al cargar clientas`);
            const data = await res.json();

            this.listaCompleta = data;
            window.GymApp.config.clientas = data.filter(c => c.activa !== false);
            localStorage.setItem('listaClientas', JSON.stringify(window.GymApp.config.clientas));

            this.actualizarLista(data);

        } catch (e) {
            console.error(e);
            alert('No se pudieron cargar las clientas. Volvé a intentar.');
        }
    },

 actualizarLista: function(clientas) {
        const listaClientas = (clientas || []).filter(c => this.mostrarBajas ? c.activa === false : c.activa !== false);
        this.listaVisible = listaClientas; // <-- Blindaje para evitar que explote si viene undefined
        const contenedor = document.getElementById('contenido-dinamico');

        if (!contenedor) return;

        contenedor.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button onclick="window.GymApp.clientas.cambiarListado(false)" style="padding:10px; margin:4px;">Activas</button>
                <button onclick="window.GymApp.clientas.cambiarListado(true)" style="padding:10px; margin:4px;">Clientas dadas de baja</button>
                <h3>${this.mostrarBajas ? 'Clientas dadas de baja' : 'Clientas activas'}</h3>
                <button onclick="window.GymApp.clientas.cargarFormulario(window.GymApp.config.clientas, window.GymApp.config.horarios)" 
                    style="width: 100%; padding: 12px; background: #ff6b8e; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 15px;">
                    + Agregar Nueva Clienta
                </button>

                <div id="contador-clientas" style="margin-bottom: 12px; padding: 10px 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff; text-align: center; font-weight: bold;">
                    👥 Total de clientas: <span style="color:#ff9a8b;">${listaClientas.length}</span>
                </div>

                <input type="text" id="buscador-clientas" placeholder="🔍 Buscar clienta..." 
                    oninput="window.GymApp.clientas.filtrar()"
                    style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff; box-sizing: border-box;">
            </div>

            <ul id="ul-clientas" style="list-style:none; padding:0;">
                ${listaClientas.map((c, i) => `
                    <li class="item-clienta" style="background: #1a1a1a; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b8e;">

                        <div onclick="window.GymApp.clientas.verDetalle(${i})" style="cursor: pointer;">
                            <strong style="color: #ff9a8b; font-size: 1.2rem;">
                                ${c.nombre} ${c.apellido}
                            </strong>

                            <p style="margin: 5px 0; font-size: 0.8rem; color: #aaa;">
                                Click para ver ficha completa
                            </p>
                        </div>

                        <div id="detalle-${i}" style="display: none; padding: 15px; background: #252525; margin-top: 10px; border-radius: 5px; color: #eee; font-size: 0.9rem;">

                            <p>
                                <strong>DNI:</strong> ${c.dni || 'No especificado'} |
                                <strong>Email:</strong> ${c.email || 'No especificado'}
                            </p>

                            <p>
                                <strong>Contacto:</strong> ${c.contacto} |
                                <strong>Ubicación:</strong> ${c.ubicacion}
                            </p>

                            <p>
                                <strong>Horario:</strong> ${c.horario} |
                                <strong>Días:</strong> ${c.dias ? (Array.isArray(c.dias) ? c.dias.join(', ') : c.dias) : 'No especificado'}
                            </p>

                            <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">

                            <p>
                                <strong>Físico:</strong>
                                Peso: ${c.peso}kg |
                                Altura: ${window.GymApp.clientas.formatearAltura(c.altura)}m
                            </p>

                            <p>
                                <strong>Medidas:</strong>
                                Busto: ${c.busto} |
                                Cintura: ${c.cintura} |
                                Cadera: ${c.cadera}
                            </p>

                            <p>
                                <strong>Tren Inferior:</strong>
                                Abductores: ${c.abductores} |
                                Cuádriceps: ${c.cuadriceps} |
                                Gemelos: ${c.gemelos}
                            </p>

                            <p>
                                <strong>Salud:</strong> ${c.salud}
                            </p>

                            <p>
                                <strong>Objetivo:</strong> ${c.objetivo}
                            </p>

                            <p>${c.activa === false ? 'Dada de baja · conserva su historial' : 'Activa'}</p>
                            <button aria-pressed="${c.descuento_familiar === true}" onclick="window.GymApp.clientas.cambiarDescuento(${i})"
                                style="padding:10px; border-radius:6px; background:${c.descuento_familiar ? '#ff9a8b' : '#444'}; color:${c.descuento_familiar ? '#000' : '#fff'};">
                                Descuento familiar: ${c.descuento_familiar ? 'ACTIVO' : 'INACTIVO'}
                            </button>
                            <div style="margin-top: 15px;">

                                <button onclick="window.GymApp.clientas.cargarFormulario(window.GymApp.clientas.listaVisible, window.GymApp.config.horarios, ${i})"
                                    style="background: #ff6b8e; border:none; padding:8px 15px; cursor:pointer; color: #000; font-weight: bold; border-radius: 5px;">
                                    Editar Ficha
                                </button>

                                <button onclick="window.GymApp.clientas.cambiarActividad(${i})"
                                    style="background: #555; color: white; border:none; padding:8px 15px; cursor:pointer; margin-left:10px; border-radius: 5px;">
                                    ${c.activa === false ? 'Reactivar' : 'Dar de baja'}
                                </button>

                            </div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
    },
    cargarFormulario: function(clientas, HORARIOS_REALES, i = null) {
        const contenedor = document.getElementById('contenido-dinamico');

        const c = (i !== null)
            ? clientas[i]
            : {
                nombre: '',
                apellido: '',
                dni: '',
                email: '',
                dias: [],
                contacto: '',
                ubicacion: '',
                peso: '',
                altura: '',
                horario: HORARIOS_REALES[0],
                busto: '',
                cintura: '',
                cadera: '',
                abductores: '',
                cuadriceps: '',
                gemelos: '',
                salud: 'no',
                objetivo: ''
            };

        contenedor.innerHTML = `

            <button onclick="window.GymApp.clientas.cargarDesdeServidor()"
                style="margin-bottom:15px; background:transparent; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:5px; cursor:pointer;">
                ← Volver a la lista
            </button>

            <form id="form-clienta"
                style="padding: 20px; border: 1px solid #ff6b8e; border-radius: 15px; background: rgba(20,20,20,0.9); color: #fff;">

                <input type="hidden" id="edit-index" value="${i !== null ? i : ''}">
                <input type="hidden" id="clienta-id" value="${c.id || ''}">

                <h3 style="color: #ff9a8b;">
                    ${i !== null ? 'Modificar Ficha' : 'Ficha Técnica Integral'}
                </h3>

                <button type="button" id="descuento-familiar" aria-pressed="${c.descuento_familiar === true}"
                    onclick="window.GymApp.clientas.toggleDescuentoFormulario(this)" style="padding:10px; margin:8px 0;">
                    Descuento familiar: ${c.descuento_familiar ? 'ACTIVO' : 'INACTIVO'}
                </button>
                <p style="color:#aaa;">El porcentaje se define en Configuración de Pagos. Solo cambia la cuota pendiente del mes actual y las futuras.</p>
                <input type="text"
                    id="nombre"
                    value="${c.nombre || ''}"
                    placeholder="Nombre"
                    style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">

                <input type="text"
                    id="apellido"
                    value="${c.apellido || ''}"
                    placeholder="Apellido"
                    style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">

                <input type="text"
                    id="dni"
                    value="${c.dni || ''}"
                    placeholder="DNI"
                    inputmode="numeric"
                    style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">

                <input type="email"
                    id="email"
                    value="${c.email || ''}"
                    placeholder="Email"
                    autocomplete="email"
                    style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">

                <p>
                    <strong>Días:</strong><br>
                    ${['Lunes','Martes','Miércoles','Jueves','Viernes']
                        .map(d => `
                            <label>
                                <input type="checkbox"
                                    name="dias"
                                    value="${d}"
                                    ${(c.dias && c.dias.includes(d)) ? 'checked' : ''}>
                                ${d}
                            </label>
                        `).join(' ')}
                </p>

                <input type="text"
                    id="contacto"
                    value="${c.contacto || ''}"
                    placeholder="Contacto"
                    style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">

                <input type="text"
                    id="ubicacion"
                    value="${c.ubicacion || ''}"
                    placeholder="Ubicación"
                    style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="number"
                        id="peso"
                        value="${c.peso || ''}"
                        placeholder="Peso (kg)"
                        style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">

                    <input type="text"
                        id="altura"
                        value="${window.GymApp.clientas.formatearAltura(c.altura)}"
                        placeholder="Altura (ej: 1,65)"
                        style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                </div>

                <select id="horario"
                    style="display:block; margin: 8px 0; width: 94%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    ${HORARIOS_REALES
                        .map(h => `<option ${c.horario === h ? 'selected' : ''}>${h}</option>`)
                        .join('')}
                </select>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                    <input type="number" id="busto" value="${c.busto || ''}" placeholder="Busto" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="cintura" value="${c.cintura || ''}" placeholder="Cintura" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="cadera" value="${c.cadera || ''}" placeholder="Cadera" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="abductores" value="${c.abductores || ''}" placeholder="Abductores" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="cuadriceps" value="${c.cuadriceps || ''}" placeholder="Cuádriceps" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="gemelos" value="${c.gemelos || ''}" placeholder="Gemelos" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                </div>

                <select id="salud"
                    onchange="window.GymApp.clientas.toggleSalud()"
                    style="display:block; margin: 15px 0 5px 0; width: 94%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <option value="no" ${(!c.salud || c.salud === 'no') ? 'selected' : ''}>¿Condición de salud? No</option>
                    <option value="si" ${(c.salud && c.salud !== 'no') ? 'selected' : ''}>¿Condición de salud? Sí</option>
                </select>

                <textarea id="detalle-salud" placeholder="Detalle de salud..." style="display:${(c.salud && c.salud !== 'no') ? 'block' : 'none'}; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">${(c.salud && c.salud !== 'no') ? c.salud : ''}</textarea>

                <textarea id="objetivo" placeholder="Objetivo" style="width: 90%; margin: 10px 0; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">${c.objetivo || ''}</textarea>

                <button type="button"
                    onclick="window.GymApp.clientas.guardar()"
                    style="width: 100%; padding: 12px; background: #ff9a8b; border:none; border-radius: 10px; font-weight: bold; cursor: pointer;">
                    Guardar Ficha
                </button>

            </form>
        `;
    },
guardar: async function() {
    console.log("🚀 Hice click en guardar y entré a la función");

        // ---------------------------------

        const index = document.getElementById('edit-index').value;
        const clientId = document.getElementById('clienta-id').value;
        const nuevaClienta = {
            descuento_familiar: document.getElementById('descuento-familiar').getAttribute('aria-pressed') === 'true',
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            dni: document.getElementById('dni').value.trim(),
            email: document.getElementById('email').value.trim().toLowerCase(),
            contacto: document.getElementById('contacto').value,
            ubicacion: document.getElementById('ubicacion').value,
            peso: document.getElementById('peso').value,
            altura: window.GymApp.clientas.formatearAltura(
                document.getElementById('altura').value
            ),
            horario: document.getElementById('horario').value,
            busto: document.getElementById('busto').value,
            cintura: document.getElementById('cintura').value,
            cadera: document.getElementById('cadera').value,
            abductores: document.getElementById('abductores').value,
            cuadriceps: document.getElementById('cuadriceps').value,
            gemelos: document.getElementById('gemelos').value,
            salud: document.getElementById('salud').value === 'si'
                ? document.getElementById('detalle-salud').value
                : 'no',
            objetivo: document.getElementById('objetivo').value,
            dias: Array.from(
                document.querySelectorAll('input[name="dias"]:checked')
            ).map(cb => cb.value)
        };

        try {
    let url = `${this.apiBase}/clientas`;
    let method = 'POST';

    if (index !== "" && clientId) {
        url = `${this.apiBase}/clientas/${clientId}`;
        method = 'PUT';
    }

            // 1. Espía antes del fetch
            console.log("🔍 OBJETO COMPLETO QUE SE ENVÍA AL SERVIDOR:", JSON.stringify(nuevaClienta));

            // 2. Hacemos el fetch
            const response = await fetch(url, {
                method: method,
                headers: this.headersAdmin(),
                body: JSON.stringify(nuevaClienta)
            });

            if (response.ok) {
                await this.cargarDesdeServidor();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Error del servidor:", errorData);
                alert("Error al guardar en el servidor.");
            }

        } catch (e) {
            console.error("No se pudo conectar a la BD", e);
            alert("Error de conexión con el servidor.");
        }
    },
    filtrar: function() {
        const busqueda = document
            .getElementById('buscador-clientas')
            .value
            .toLowerCase();

        let visibles = 0;
        const items = document.querySelectorAll('.item-clienta');

        items.forEach(item => {
            const coincide = item.textContent
                .toLowerCase()
                .includes(busqueda);

            item.style.display = coincide ? "" : "none";
            if (coincide) visibles++;
        });

        const contador = document.getElementById('contador-clientas');
        if (contador) {
            contador.innerHTML = busqueda
                ? `👥 Mostrando: <span style="color:#ff9a8b;">${visibles}</span> de ${items.length} clientas`
                : `👥 Total de clientas: <span style="color:#ff9a8b;">${items.length}</span>`;
        }
    },

    verDetalle: function(i) {
        const detalle = document.getElementById(`detalle-${i}`);

        if (detalle) {
            detalle.style.display =
                (detalle.style.display === 'none')
                    ? 'block'
                    : 'none';
        }
    },

    toggleSalud: function() {
        const select = document.getElementById('salud');
        const textarea = document.getElementById('detalle-salud');
        if (select && textarea) {
            textarea.style.display = (select.value === 'si') ? 'block' : 'none';
        }
    },

    cambiarListado: async function(bajas) {
        this.mostrarBajas = bajas;
        await this.cargarDesdeServidor();
    },
    toggleDescuentoFormulario: function(boton) {
        const activo = boton.getAttribute('aria-pressed') !== 'true';
        boton.setAttribute('aria-pressed',String(activo));
        boton.textContent = 'Descuento familiar: ' + (activo ? 'ACTIVO' : 'INACTIVO');
    },
    cambiarActividad: async function(i) {
        const c = this.listaVisible[i];
        if (!c) return;
        const activa = c.activa === false;
        const mensaje = activa
            ? '¿Reactivar a ' + c.nombre + ' ' + c.apellido + '? Generará cuota desde este mes, sin cobrar los meses de baja.'
            : '¿Dar de baja a ' + c.nombre + ' ' + c.apellido + '? Se conservan la cuota de este mes, las deudas y los pagos. No generará cuotas desde el mes siguiente.';
        if (!confirm(mensaje)) return;
        await this.enviarCambio(c.id,'actividad',{activa});
    },
    cambiarDescuento: async function(i) {
        const c = this.listaVisible[i];
        if (!c) return;
        if (!confirm('¿' + (c.descuento_familiar ? 'Desactivar' : 'Activar') + ' descuento familiar para ' + c.nombre + ' ' + c.apellido + '? Se actualizará la cuota pendiente de este mes.')) return;
        await this.enviarCambio(c.id,'descuento-familiar',{activo:!c.descuento_familiar});
    },
    enviarCambio: async function(id,accion,datos) {
        if (this.cambioEnCurso) return;
        this.cambioEnCurso = true;
        try {
            const res = await fetch(`${this.apiBase}/clientas/${id}/${accion}`,{
                method:'POST',headers:this.headersAdmin(),body:JSON.stringify(datos)
            });
            const respuesta = await res.json();
            if (!res.ok) throw new Error(respuesta.error || 'No se pudo guardar el cambio');
            await this.cargarDesdeServidor();
        } catch(e) { alert(e.message); }
        finally { this.cambioEnCurso = false; }
    }
};

window.GymApp = window.GymApp || {};

window.GymApp.clientas = {
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
            const res = await fetch('https://booty-gym-backend.onrender.com/clientas');
            const data = await res.json();
            window.GymApp.config.clientas = data;
            localStorage.setItem('listaClientas', JSON.stringify(data));
            this.actualizarLista(data);
        } catch (e) {
            console.error("Error al cargar desde servidor, usando respaldo local");
            const local = JSON.parse(localStorage.getItem('listaClientas')) || [];
            this.actualizarLista(local);
        }
    },

    actualizarLista: function(clientas) {
        const contenedor = document.getElementById('contenido-dinamico');
        if (!contenedor) return;

        contenedor.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button onclick="window.GymApp.clientas.cargarFormulario(window.GymApp.config.clientas, window.GymApp.config.horarios)" 
                    style="width: 100%; padding: 12px; background: #ff6b8e; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 15px;">
                    + Agregar Nueva Clienta
                </button>
                <input type="text" id="buscador-clientas" placeholder="🔍 Buscar clienta..." 
                    oninput="window.GymApp.clientas.filtrar()"
                    style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff; box-sizing: border-box;">
            </div>
            <ul id="ul-clientas" style="list-style:none; padding:0;">
                ${clientas.map((c, i) => `
                    <li class="item-clienta" style="background: #1a1a1a; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b8e;">
                        <div onclick="window.GymApp.clientas.verDetalle(${i})" style="cursor: pointer;">
                            <strong style="color: #ff9a8b; font-size: 1.2rem;">${c.nombre} ${c.apellido}</strong>
                            <p style="margin: 5px 0; font-size: 0.8rem; color: #aaa;">Click para ver ficha completa</p>
                        </div>
                        <div id="detalle-${i}" style="display: none; padding: 15px; background: #252525; margin-top: 10px; border-radius: 5px; color: #eee; font-size: 0.9rem;">
                            <p><strong>Contacto:</strong> ${c.contacto} | <strong>Ubicación:</strong> ${c.ubicacion}</p>
                            <p><strong>Horario:</strong> ${c.horario} | <strong>Días:</strong> ${c.dias ? (Array.isArray(c.dias) ? c.dias.join(', ') : c.dias) : 'No especificado'}</p>
                            <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">
                            <p><strong>Físico:</strong> Peso: ${c.peso}kg | Altura: ${window.GymApp.clientas.formatearAltura(c.altura)}m</p>
                            <p><strong>Medidas:</strong> Busto: ${c.busto} | Cintura: ${c.cintura} | Cadera: ${c.cadera}</p>
                            <p><strong>Tren Inferior:</strong> Abductores: ${c.abductores} | Cuádriceps: ${c.cuadriceps} | Gemelos: ${c.gemelos}</p>
                            <p><strong>Salud:</strong> ${c.salud}</p>
                            <p><strong>Objetivo:</strong> ${c.objetivo}</p>
                            <div style="margin-top: 15px;">
                                <button onclick="window.GymApp.clientas.cargarFormulario(window.GymApp.config.clientas, window.GymApp.config.horarios, ${i})" style="background: #ff6b8e; border:none; padding:8px 15px; cursor:pointer; color: #000; font-weight: bold; border-radius: 5px;">Editar Ficha</button>
                                <button onclick="window.GymApp.clientas.eliminar(${i})" style="background: #555; color: white; border:none; padding:8px 15px; cursor:pointer; margin-left:10px; border-radius: 5px;">Eliminar</button>
                            </div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
    },

    cargarFormulario: function(clientas, HORARIOS_REALES, i = null) {
        const contenedor = document.getElementById('contenido-dinamico');
        const c = (i !== null) ? clientas[i] : { nombre:'', apellido:'', dias:[], contacto:'', ubicacion:'', peso:'', altura: '', horario: HORARIOS_REALES[0], busto:'', cintura:'', cadera:'', abductores:'', cuadriceps:'', gemelos:'', salud:'no', objetivo:'' };

        contenedor.innerHTML = `
            <button onclick="window.GymApp.clientas.cargarDesdeServidor()" style="margin-bottom:15px; background:transparent; color:#ff9a8b; border:1px solid #ff9a8b; padding:8px 15px; border-radius:5px; cursor:pointer;">← Volver a la lista</button>
            <form id="form-clienta" style="padding: 20px; border: 1px solid #ff6b8e; border-radius: 15px; background: rgba(20,20,20,0.9); color: #fff;">
                <input type="hidden" id="edit-index" value="${i !== null ? i : ''}">
                <input type="hidden" id="clienta-id" value="${c.id || ''}">
                <h3 style="color: #ff9a8b;">${i !== null ? 'Modificar Ficha' : 'Ficha Técnica Integral'}</h3>
                <input type="text" id="nombre" value="${c.nombre || ''}" placeholder="Nombre" style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                <input type="text" id="apellido" value="${c.apellido || ''}" placeholder="Apellido" style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                <p><strong>Días:</strong><br>${['Lunes','Martes','Miércoles','Jueves','Viernes'].map(d => `<label><input type="checkbox" name="dias" value="${d}" ${(c.dias && c.dias.includes(d)) ? 'checked' : ''}> ${d}</label>`).join(' ')}</p>
                <input type="text" id="contacto" value="${c.contacto || ''}" placeholder="Contacto" style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                <input type="text" id="ubicacion" value="${c.ubicacion || ''}" placeholder="Ubicación" style="display:block; margin: 8px 0; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="number" id="peso" value="${c.peso || ''}" placeholder="Peso (kg)" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="text" id="altura" value="${window.GymApp.clientas.formatearAltura(c.altura)}" placeholder="Altura (ej: 1,65)" onblur="this.value = window.GymApp.clientas.formatearAltura(this.value)" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                </div>
                <select id="horario" style="display:block; margin: 8px 0; width: 94%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">${HORARIOS_REALES.map(h => `<option ${c.horario === h ? 'selected' : ''}>${h}</option>`).join('')}</select>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                    <input type="number" id="busto" value="${c.busto || ''}" placeholder="Busto" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="cintura" value="${c.cintura || ''}" placeholder="Cintura" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="cadera" value="${c.cadera || ''}" placeholder="Cadera" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="abductores" value="${c.abductores || ''}" placeholder="Abductores" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="cuadriceps" value="${c.cuadriceps || ''}" placeholder="Cuádriceps" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <input type="number" id="gemelos" value="${c.gemelos || ''}" placeholder="Gemelos" style="padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                </div>
                <select id="salud" onchange="window.GymApp.clientas.toggleSalud()" style="display:block; margin: 15px 0 5px 0; width: 94%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">
                    <option value="no" ${(!c.salud || c.salud === 'no') ? 'selected' : ''}>¿Condición de salud? No</option>
                    <option value="si" ${c.salud && c.salud !== 'no' ? 'selected' : ''}>¿Condición de salud? Sí</option>
                </select>
                <textarea id="detalle-salud" placeholder="Detalle de salud..." style="display:${(c.salud && c.salud !== 'no') ? 'block' : 'none'}; width: 90%; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">${(c.salud && c.salud !== 'no') ? c.salud : ''}</textarea>
                <textarea id="objetivo" placeholder="Objetivo" style="width: 90%; margin: 10px 0; padding: 8px; background: #333; color: #fff; border:none; border-radius: 5px;">${c.objetivo || ''}</textarea>
                <button type="button" onclick="window.GymApp.clientas.guardar()" style="width: 100%; padding: 12px; background: #ff9a8b; border:none; border-radius: 10px; font-weight: bold; cursor: pointer;">Guardar Ficha</button>
            </form>
        `;
    },

    toggleSalud: function() {
        const select = document.getElementById('salud');
        const textarea = document.getElementById('detalle-salud');
        textarea.style.display = (select.value === 'si') ? 'block' : 'none';
    },

    guardar: async function() {
        const index = document.getElementById('edit-index').value;
        const clientId = document.getElementById('clienta-id').value;
        
        const nuevaClienta = {
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            contacto: document.getElementById('contacto').value,
            ubicacion: document.getElementById('ubicacion').value,
            peso: document.getElementById('peso').value,
            altura: window.GymApp.clientas.formatearAltura(document.getElementById('altura').value),
            horario: document.getElementById('horario').value,
            busto: document.getElementById('busto').value,
            cintura: document.getElementById('cintura').value,
            cadera: document.getElementById('cadera').value,
            abductores: document.getElementById('abductores').value,
            cuadriceps: document.getElementById('cuadriceps').value,
            gemelos: document.getElementById('gemelos').value,
            salud: document.getElementById('salud').value === 'si' ? document.getElementById('detalle-salud').value : 'no',
            objetivo: document.getElementById('objetivo').value,
            dias: Array.from(document.querySelectorAll('input[name="dias"]:checked')).map(cb => cb.value)
        };
        
        try {
            let url = 'https://booty-gym-backend.onrender.com/clientas';
            let method = 'POST';

            // Si tiene ID y estamos editando, usamos PUT
            if (index !== "" && clientId) {
                url = `https://booty-gym-backend.onrender.com/clientas/${clientId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(nuevaClienta)
            });

            if (response.ok) {
                await this.cargarDesdeServidor();
            } else {
                alert("Error al guardar en el servidor.");
            }
        } catch (e) { 
            console.error("No se pudo conectar a la BD", e);
            alert("Error de conexión con el servidor.");
        }
    },

    filtrar: function() {
        const busqueda = document.getElementById('buscador-clientas').value.toLowerCase();
        document.querySelectorAll('.item-clienta').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(busqueda) ? "" : "none";
        });
    },

    verDetalle: function(i) {
        const detalle = document.getElementById(`detalle-${i}`);
        if (detalle) detalle.style.display = (detalle.style.display === 'none') ? 'block' : 'none';
    },

    eliminar: async function(i) {
        if(confirm('¿Segura de eliminar esta clienta?')) {
            const clientasActuales = window.GymApp.config.clientas || [];
            const clientaAEliminar = clientasActuales[i];

            if (!clientaAEliminar || !clientaAEliminar.id) {
                alert("Error: No se pudo identificar el ID de la clienta.");
                return;
            }

            try {
                const response = await fetch(`https://booty-gym-backend.onrender.com/clientas/${clientaAEliminar.id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    await this.cargarDesdeServidor();
                } else {
                    alert("No se pudo eliminar la clienta del servidor.");
                }
            } catch (error) {
                console.error("Error de conexión al eliminar:", error);
                alert("Error de conexión con el servidor.");
            }
        }
    }
};
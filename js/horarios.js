window.GymApp = window.GymApp || {};

window.GymApp.horarios = {
    horariosDefault: [
        '07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', 
        '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '17:00 - 18:00', 
        '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00'
    ],

    mostrarDias: function() {
        const contenedor = document.getElementById('dias-semana');
        if (!contenedor) return;

        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        contenedor.innerHTML = dias.map(d => `
            <button onclick="window.GymApp.horarios.seleccionarDia('${d}')" 
            style="margin:5px; padding:10px 15px; border-radius: 10px; border: 1px solid #ff9a8b; background: rgba(30,30,30,0.8); color: #fff; font-weight: bold; cursor: pointer;">
                ${d}
            </button>
        `).join('');
    },

    seleccionarDia: function(dia) {
        const contenedor = document.getElementById('detalle-horario');
        if (!contenedor) {
            console.error("No se encontró el contenedor #detalle-horario");
            return;
        }

        const horarios = this.horariosDefault;
        
        contenedor.innerHTML = `
            <h3 style="color: #ff9a8b; margin-top: 10px; text-align: center;">${dia} - Selecciona un Horario</h3>
            ${horarios.map(h => `
                <button onclick="window.GymApp.horarios.mostrarClientas('${h}', '${dia}')" 
                style="display:block; margin:10px auto; width:80%; padding:10px; border-radius: 10px; border: none; background: #333; color: #ff9a8b; font-weight: bold; cursor: pointer;">
                    ${h}
                </button>
            `).join('')}
        `;
    },

    mostrarClientas: function(horario, dia) {
        const contenedor = document.getElementById('detalle-horario');
        if (!contenedor) return;

        const clientas = JSON.parse(localStorage.getItem('listaClientas')) || [];
        const filtradas = clientas.filter(c => c.horario === horario && (c.dias && c.dias.includes(dia)));

        contenedor.innerHTML = `
            <h3 style="color: #ff9a8b; text-align: center;">${dia} - ${horario}</h3>
            ${filtradas.length > 0 
                ? `<ul style="list-style:none; padding:0; text-align:center;">${filtradas.map(c => `
                    <li style="color: #fff; padding: 10px; border-bottom: 1px solid #444;">${c.nombre} ${c.apellido}</li>
                  `).join('')}</ul>` 
                : '<p style="color: #bbb; text-align: center;">Sin clientas registradas en este turno.</p>'
            }
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="window.GymApp.horarios.seleccionarDia('${dia}')" style="background:#444; color:#fff; border:none; padding:5px 15px; border-radius:5px; cursor:pointer;">Volver</button>
            </div>
        `;
    }
};
// 1. Aseguramos el espacio de nombres
window.GymApp = window.GymApp || {};

// 2. Definimos la lógica de inicio (INTEGRACIÓN CON BD)
window.GymApp.init = async function() {
    window.GymApp.config = {
        pagosConfig: { montoCuota: 0, interesPorcentaje: 0 }, // Se actualizará desde la BD
        horarios: ['07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00']
    };

    try {
        // Obtenemos el gym_id guardado tras el login
        const gymId = localStorage.getItem('gym_id') || 'BOOTY_GYM_001';
        
        // Conexión al servidor en Render para clientas
        const response = await fetch(`https://booty-gym-backend.onrender.com/clientas?gym_id=${gymId}`);
        
        if (response.ok) {
            const data = await response.json();
            window.GymApp.config.clientas = data;
            localStorage.setItem('listaClientas', JSON.stringify(data));
        } else {
            throw new Error('Servidor responde error');
        }
    } catch (error) {
        console.warn("Servidor inactivo para clientas, cargando datos desde almacenamiento local:", error);
        window.GymApp.config.clientas = JSON.parse(localStorage.getItem('listaClientas')) || [];
    }

    // --- NUEVO: CARGAR CONFIGURACIÓN GLOBAL DESDE POSTGRESQL ---
    try {
    const res = await fetch('https://booty-gym-backend.onrender.com/');
    const text = await res.text();
    // Intentar parsear a JSON de forma segura
    const data = text.startsWith('{') ? JSON.parse(text) : { message: text };
    console.log("Config cargada:", data);
} catch (error) {
    console.warn("No se pudo cargar la config del servidor, usando respaldo local:", error);
}
};

// 3. Ejecutamos el init
window.GymApp.init();

// --- INICIO DE SEGURIDAD Y LOGIN ---
// IMPORTANTE: Asegúrate de que en tu lógica de login cuando el login sea exitoso, guardes el ID así: localStorage.setItem('gym_id', data.gym_id);

setTimeout(() => {
    if (!window.GymApp.adminLogueado && window.GymApp.login) {
        document.getElementById('sidebar').style.display = 'none';
        window.GymApp.login.renderizar();
    }
}, 500);

// 4. Definimos la función de navegación (MANTENIDA SIN CAMBIOS)
window.GymApp.cambiarVista = function(vista) {
    if (!window.GymApp.adminLogueado) {
        document.getElementById('sidebar').style.display = 'none';
        window.GymApp.login.renderizar();
        return; 
    }

    const main = document.getElementById('app');
    
    switch(vista) {
        case 'CLIENTAS':
            main.innerHTML = `${window.GymApp.renderLogo()} <h2>Panel de Clientas</h2><div id="contenido-dinamico"></div><ul id="ul-clientas"></ul>`;
            window.GymApp.clientas.cargarFormulario(window.GymApp.config.clientas, window.GymApp.config.horarios);
            window.GymApp.clientas.actualizarLista(window.GymApp.config.clientas);
            break;
        case 'RUTINAS':
            main.innerHTML = `${window.GymApp.renderLogo()} <h2>Control de Horarios</h2><div id="dias-semana"></div><div id="detalle-horario"></div>`;
            window.GymApp.horarios.mostrarDias();
            break;
        case 'PAGOS':
            main.innerHTML = `${window.GymApp.renderLogo()}`;
            if (window.GymApp.pagos) window.GymApp.pagos.renderizarInterfaz();
            break;
        case 'CONFIG':
            main.innerHTML = `
                ${window.GymApp.renderLogo()}
                <h2 style="color: #ff9a8b; text-align: center;">Configuración de Pagos</h2>
                <div style="max-width: 300px; margin: 20px auto; background: rgba(20,20,20,0.85); padding: 20px; border-radius: 15px; border: 1px solid #333; color: #fff;">
                    <label>Monto Cuota ($):</label>
                    <input type="number" id="in-monto" value="${window.GymApp.config.pagosConfig.montoCuota}" style="width:100%; margin-bottom:15px; padding:8px; background:#111; color:#fff; border:1px solid #444;">
                    <label>Interés (%):</label>
                    <input type="number" id="in-interes" value="${window.GymApp.config.pagosConfig.interesPorcentaje}" style="width:100%; margin-bottom:20px; padding:8px; background:#111; color:#fff; border:1px solid #444;">
                    <button onclick="window.GymApp.pagos.guardarConfig()" style="width:100%; padding:10px; background:#ff9a8b; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">GUARDAR CAMBIOS</button>
                </div>`;
            break;
        case 'BOOTY':
            if (window.GymApp.bootyclub) {
                window.GymApp.bootyclub.cargar();
            }
            break;
    }
};

window.GymApp.renderLogo = function() {
    return `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="logo.png" style="width: 100px; height: 100px; border-radius: 50%; border: 2px solid #ff9a8b; box-shadow: 0 0 15px rgba(255, 154, 139, 0.5);">
        </div>
    `;
};

// Mostrar el usuario al cargar la página
window.addEventListener('load', () => {
    const admin = localStorage.getItem('admin_user');
    const gymId = localStorage.getItem('gym_id');
    const userDisplay = document.getElementById('user-display');
    const sidebar = document.getElementById('sidebar');

    if (admin && gymId) {
        window.GymApp.adminLogueado = true;
        if (sidebar) sidebar.style.display = 'block';
        if (userDisplay) {
            userDisplay.innerText = "Admin: " + admin;
        }
    }
});// Agrega esto en tu app.js para que el botón funcione de verdad:
async function solicitarCodigoRecuperacion(username) {
    try {
        const respuesta = await fetch('https://booty-gym-backend.onrender.com/solicitar-codigo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });

        const resultado = await respuesta.json();
        
        if (resultado.success) {
            alert("¡Código generado con éxito! Revisa la consola de tu servidor en Render para ver el código.");
            // Aquí puedes cambiar de pantalla para que el usuario ingrese el código
        } else {
            alert(resultado.message);
        }
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
    }
}
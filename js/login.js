window.GymApp = window.GymApp || {};

window.GymApp.login = {
    renderizar: function() {
        const main = document.getElementById('app');
        main.innerHTML = `
            <div id="login-container" style="max-width: 350px; margin: 100px auto; padding: 30px; background: rgba(20,20,20,0.9); border: 1px solid #ff9a8b; border-radius: 15px; text-align: center; color: #fff; backdrop-filter: blur(10px);">
                ${window.GymApp.renderLogo()}
                <h2 style="color: #ff9a8b; margin-bottom: 20px;">ACCESO ADMINISTRATIVO</h2>
                <input type="text" id="login-user" placeholder="Usuario" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #333; background: #111; color: #fff; box-sizing: border-box;">
                <input type="password" id="login-pass" placeholder="Contraseña" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #333; background: #111; color: #fff; box-sizing: border-box;">
                
                <input type="email" id="reg-email" placeholder="Correo electrónico" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #333; background: #111; color: #fff; box-sizing: border-box;">
                
                <button onclick="window.GymApp.login.validar()" style="width: 100%; padding: 10px; background: #ff9a8b; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; color: black; margin-bottom: 10px;">INGRESAR</button>
                <button onclick="window.GymApp.login.registrar()" style="width: 100%; padding: 8px; background: transparent; border: 1px solid #ff9a8b; color: #ff9a8b; border-radius: 5px; cursor: pointer; font-size: 0.8em; margin-bottom: 15px;">Crear nuevo admin</button>
                
                <p style="cursor:pointer; color:#aaa; font-size:0.8em; text-decoration:underline;" onclick="window.GymApp.login.iniciarRecuperacion()">¿Olvidaste tu contraseña?</p>
            </div>
        `;
    },

    iniciarRecuperacion: function() {
        console.log("1. Se hizo clic en recuperar contraseña");
        
        const inputUser = document.getElementById('login-user');
        if (!inputUser) {
            alert("ERROR: No se encontró el campo de usuario en la pantalla.");
            return;
        }
        
        const user = inputUser.value;
        console.log("2. Usuario obtenido:", user);

        if (!user) {
            alert("Por favor, ingresa tu usuario arriba primero.");
            return;
        }
        
        console.log("3. Intentando conectar con Render...");
        
        fetch('https://booty-gym-backend.onrender.com/solicitar-codigo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user })
        })
        .then(res => {
            console.log("4. Respuesta recibida del servidor");
            return res.json();
        })
        .then(data => {
            console.log("5. Datos procesados:", data);
            if (data.success) {
                const container = document.getElementById('login-container');
                if (container) {
                    container.innerHTML = `
                        ${window.GymApp.renderLogo()}
                        <h2 style="color: #ff9a8b; margin-bottom: 20px;">Verificación</h2>
                        <p style="font-size: 0.9em; color: white; margin-bottom: 15px;">Ingresa el código enviado o revisa la consola de Render:</p>
                        <input type="text" id="rec-codigo" placeholder="Código de 6 dígitos" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #333; background: #111; color: #fff; box-sizing: border-box;">
                        <input type="password" id="rec-new-pass" placeholder="Nueva contraseña" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #333; background: #111; color: #fff; box-sizing: border-box;">
                        <button onclick="window.GymApp.login.finalizarRecuperacion('${user}')" style="width: 100%; padding: 10px; background: #ff9a8b; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; color: black;">CAMBIAR CONTRASEÑA</button>
                    `;
                }
            } else {
                alert("El servidor dijo: " + (data.message || "Usuario no encontrado"));
            }
        })
        .catch(err => {
            console.error("6. Error en el fetch:", err);
            alert("Error crítico al conectar con el servidor de Render.");
        });
    },
    finalizarRecuperacion: async function(username) {
        const codigo = document.getElementById('rec-codigo').value;
        const nuevaPass = document.getElementById('rec-new-pass').value;

        const response = await fetch('https://booty-gym-backend.onrender.com/verificar-y-cambiar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, codigo, nuevaPass })
        });

        const data = await response.json();
        if (data.success) {
            alert("¡Contraseña actualizada con éxito!");
            window.location.reload();
        } else {
            alert("Código incorrecto o error al actualizar");
        }
    },

    registrar: async function() {
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;
        const email = document.getElementById('reg-email').value;
        
        if (!user || !pass || !email) return alert("Completa usuario, contraseña y email");

        try {
            const response = await fetch('https://booty-gym-backend.onrender.com/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, pass, email })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert("Administrador creado correctamente");
            } else {
                alert("Error al registrar: " + (data.message || data.error || "Desconocido"));
            }
        } catch (err) { 
            alert("Error al conectar con el servidor"); 
        }
    },

    validar: async function() {
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;

        try {
            const response = await fetch('https://booty-gym-backend.onrender.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, pass })
            });

            const data = await response.json();

            if (data.success) {
                const nombreOficial = data.username || data.user || user;
                localStorage.setItem('gym_id', data.gym_id);
                localStorage.setItem('admin_user', nombreOficial); 
                window.GymApp.adminLogueado = true;
                
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.style.display = 'block';

                const userDisplay = document.getElementById('user-display');
                if (userDisplay) {
                    userDisplay.innerText = "Admin: " + nombreOficial;
                }
                
                window.GymApp.cambiarVista('CLIENTAS'); 
            } else {
                alert("Usuario no encontrado o contraseña incorrecta");
            }
        } catch (err) {
            alert("Error de conexión con la base de datos");
        }
    },

    logout: function() {
        localStorage.removeItem('gym_id');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('listaClientas');
        window.GymApp.adminLogueado = false;
        document.getElementById('sidebar').style.display = 'none';
        window.location.reload();
    }
};
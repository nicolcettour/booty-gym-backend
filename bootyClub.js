window.GymApp = window.GymApp || {};

window.GymApp.bootyclub = {
    cargar: function() {
        const main = document.getElementById('app');
        main.style.backgroundColor = "transparent"; 
        
        main.innerHTML = `
            <style>
                .app-container { font-family: 'Poppins', sans-serif; color: #ffffff; padding: 20px; }
                .card-gradient { background: rgba(30, 30, 30, 0.8); border: 1px solid #333; border-radius: 25px; padding: 25px; margin-bottom: 25px; backdrop-filter: blur(5px); }
                h3 { color: #ff9a8b; font-size: 1.2em; text-transform: uppercase; letter-spacing: 1px; }
                .beneficiaria-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #444; }
                .badge { background: linear-gradient(to right, #ff9a8b, #ff6a88); color: #000; padding: 3px 10px; border-radius: 15px; font-size: 0.7em; font-weight: bold; margin-right: 12px; }
                .galeria-beneficios { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
                .tarjeta-beneficio { position: relative; border: 2px solid #ff9a8b; border-radius: 15px; overflow: hidden; }
                .tarjeta-beneficio img { width: 100%; display: block; }
                .btn-eliminar { position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; }
                
                .mascota-wrapper { position: fixed; bottom: 20px; right: 20px; z-index: 1000; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
                .burbuja { background: #fff; color: #333; padding: 15px; border-radius: 20px; margin-bottom: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); max-width: 180px; text-align: center; font-weight: bold; position: relative; }
                .burbuja::after { content: ''; position: absolute; bottom: -8px; left: 50%; margin-left: -8px; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid #fff; }
                .img-personaje { width: 180px; height: auto; animation: flotar 3s ease-in-out infinite; }
                @keyframes flotar { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
            </style>

            <div class="app-container">
                ${window.GymApp.renderLogo()}
                <h2 style="text-align:center; color: #ff9a8b;">BOOTY CLUB</h2>
                <div class="card-gradient">
                    <h3>Beneficiarias Activas</h3>
                    <div id="lista-beneficiarias"></div>
                </div>
                <div class="card-gradient">
                    <h3>BENEFICIOS</h3>
                    <input type="file" id="input-imagen" accept="image/*" style="display:none;">
                    <button id="btn-subir" style="width:100%; padding:10px; background:#ff9a8b; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">+ Agregar Beneficio</button>
                    <div id="contenedor-beneficios" class="galeria-beneficios" style="margin-top:20px;"></div>
                </div>
            </div>

            <div class="mascota-wrapper" id="booty-mascota">
                <div class="burbuja" id="burbuja-frase"></div>
                <img src="mascota.png" class="img-personaje" alt="Mascota">
            </div>
        `;

        document.getElementById('btn-subir').onclick = () => document.getElementById('input-imagen').click();
        document.getElementById('input-imagen').onchange = (e) => this.agregarBeneficio(e);
        document.getElementById('booty-mascota').onclick = () => this.mostrarFraseAliento();

        this.renderizarListasBooty();
        this.actualizarGaleria();
        this.mostrarFraseAliento();
    },

    mostrarFraseAliento: function() {
        const frases = ["¡Hoy es el día para tu 100%! 🍑", "¡Recuerda que cada gota cuenta!", "Tu esfuerzo de hoy es tu éxito de mañana. ¡Vamos!", "¡Eres una guerrera, sigue enfocada!", "¡Tu mejor versión se construye con alegría!", "¡No te detengas hasta estar orgullosa!", "¡El dolor de hoy será tu fuerza mañana!", "¡Estás creando algo increíble!", "¡Respira, entrena y conquista tu día!", "¡Esa actitud te llevará lejos!", "¡Transformar tu vida empieza hoy!", "¡Tu disciplina es tu superpoder!", "¡Suda hoy, brilla siempre!", "¡La constancia es la llave!", "¡Mira adelante y confía en tu proceso!", "¡Hoy superas tus propios límites!", "¡Ese brillo en tus ojos es fuego puro!", "¡Eres capaz de lograr todo!", "¡Entrenar es un regalo para ti!", "¡Mantente firme, lo lograrás!"];
        const el = document.getElementById('burbuja-frase');
        if (el) el.innerText = frases[Math.floor(Math.random() * frases.length)];
    },

    agregarBeneficio: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            let beneficios = JSON.parse(localStorage.getItem('listaBeneficios')) || [];
            beneficios.push(e.target.result);
            localStorage.setItem('listaBeneficios', JSON.stringify(beneficios));
            this.actualizarGaleria();
        };
        reader.readAsDataURL(file);
    },

    actualizarGaleria: function() {
        const contenedor = document.getElementById('contenedor-beneficios');
        if (!contenedor) return;
        let beneficios = JSON.parse(localStorage.getItem('listaBeneficios')) || [];
        contenedor.innerHTML = beneficios.map((src, index) => `
            <div class="tarjeta-beneficio">
                <img src="${src}" alt="Beneficio">
                <button class="btn-eliminar" onclick="window.GymApp.bootyclub.eliminarBeneficio(${index})">×</button>
            </div>
        `).join('');
    },

    eliminarBeneficio: function(index) {
        let beneficios = JSON.parse(localStorage.getItem('listaBeneficios')) || [];
        beneficios.splice(index, 1);
        localStorage.setItem('listaBeneficios', JSON.stringify(beneficios));
        this.actualizarGaleria();
    },

    renderizarListasBooty: function() {
        const contenedor = document.getElementById('lista-beneficiarias');
        if (!contenedor) return;

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();
        
        const listaClientas = window.GymApp.config.clientas || [];
        
        const beneficiarias = listaClientas.filter(c => {
            if (c.estadoPago !== 'Pagado' || !c.fechaPago) return false;
            
            const fechaPago = new Date(c.fechaPago);
            
            const esMismoMes = fechaPago.getMonth() === mesActual;
            const esMismoAnio = fechaPago.getFullYear() === anioActual;
            
            return esMismoMes && esMismoAnio;
        });
        
        contenedor.innerHTML = beneficiarias.length > 0 
            ? beneficiarias.map(c => `
                <div class="beneficiaria-item">
                    <span class="badge">ACTIVA</span>
                    <span>${c.nombre} ${c.apellido || ''}</span>
                </div>
            `).join('') 
            : '<p style="color:#bbb; text-align:center;">No hay clientas activas este mes.</p>';
    }
};
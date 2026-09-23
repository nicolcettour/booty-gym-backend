window.GymApp = window.GymApp || {};

window.GymApp.bootyclub = {

    apiBase: 'https://booty-gym-backend-1.onrender.com',

    esAdminPrincipal: function() {
        return localStorage.getItem('admin_user') === 'Priscila.admin';
    },

    obtenerToken: function() {
        return localStorage.getItem('admin_token');
    },

    escaparHTML: function(valor) {
        return String(valor || '')
            .replace(/[&<>"']/g, caracter => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[caracter]));
    },

    cargar: function() {

        const main = document.getElementById('app');

        if (!main) return;

        main.style.backgroundColor = 'transparent';

        const esAdmin =
            this.esAdminPrincipal();

        main.innerHTML = `
            <style>

                .booty-container {
                    font-family: 'Poppins', sans-serif;
                    color: #fff;
                    padding: 20px;
                }

                .booty-card {
                    background: rgba(25,25,25,.88);
                    border: 1px solid #333;
                    border-radius: 24px;
                    padding: 24px;
                    margin-bottom: 25px;
                    backdrop-filter: blur(6px);
                }

                .booty-card h3 {
                    color: #ff9a8b;
                    font-size: 1.05rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-top: 0;
                }

                .beneficiaria-item {
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    border-bottom: 1px solid #444;
                }

                .badge {
                    background: #ff9a8b;
                    color: #111;
                    padding: 3px 10px;
                    border-radius: 15px;
                    font-size: .7rem;
                    font-weight: 800;
                    margin-right: 12px;
                }


                /* ================================
                   FORMULARIO ADMINISTRADORA
                ================================= */

                .form-beneficio {
                    background: #181818;
                    border: 1px solid #3c3c3c;
                    border-radius: 18px;
                    padding: 18px;
                    margin-bottom: 28px;
                }

                .form-beneficio textarea {
                    width: 100%;
                    box-sizing: border-box;
                    min-height: 80px;
                    resize: vertical;
                    background: #101010;
                    color: #fff;
                    border: 1px solid #444;
                    border-radius: 12px;
                    padding: 12px;
                    margin: 10px 0;
                    font-family: inherit;
                    font-size: .95rem;
                }

                .form-beneficio input[type="file"] {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 10px;
                    margin-bottom: 12px;
                    color: #bbb;
                    background: #101010;
                    border: 1px solid #444;
                    border-radius: 10px;
                }

                .btn-publicar-beneficio {
                    width: 100%;
                    padding: 13px;
                    border: none;
                    border-radius: 12px;
                    background: #ff9a8b;
                    color: #111;
                    font-weight: 800;
                    cursor: pointer;
                    font-size: .95rem;
                }

                .btn-publicar-beneficio:disabled {
                    opacity: .55;
                    cursor: wait;
                }


                /* ================================
                   NUBECITAS DE BENEFICIOS
                ================================= */

                .galeria-beneficios {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 22px;
    align-items: stretch;
    justify-content: flex-start;
}

.tarjeta-beneficio {
    position: relative;
    width: 260px;
    background: #ffffff;
    color: #222;
    padding: 14px;
    border-radius: 28px;
    box-shadow:
        0 10px 24px rgba(0, 0, 0, 0.22),
        0 0 0 1px rgba(255, 255, 255, 0.22);

    animation: nubeFlotar 4.5s ease-in-out infinite;
    transform-origin: center;
}

.tarjeta-beneficio:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 30px rgba(0,0,0,0.35);
}

.tarjeta-beneficio img {
    display: block;
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 20px;
}

.descripcion-beneficio {
    padding: 12px 8px 6px;
    text-align: center;
    font-size: .92rem;
    font-weight: 700;
    line-height: 1.4;
    color: #222;
}

.btn-eliminar {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    background: #d94c63;
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
}

.btn-eliminar:hover {
    transform: scale(1.05);
}

.estado-vacio-beneficios {
    width: 100%;
    text-align: center;
    color: #bdbdbd;
    padding: 28px 10px;
    border: 1px dashed rgba(255,255,255,0.12);
    border-radius: 24px;
    background: rgba(255,255,255,0.02);
}


                /* ================================
                   MASCOTA
                ================================= */

                .mascota-wrapper {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                }

                .burbuja {
                    background: #fff;
                    color: #333;
                    padding: 15px;
                    border-radius: 20px;
                    margin-bottom: 10px;
                    box-shadow: 0 5px 15px rgba(0,0,0,.5);
                    max-width: 180px;
                    text-align: center;
                    font-weight: bold;
                    position: relative;
                }

                .burbuja::after {
                    content: '';
                    position: absolute;
                    bottom: -8px;
                    left: 50%;
                    margin-left: -8px;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 8px solid #fff;
                }

                .img-personaje {
                    width: 180px;
                    height: auto;
                    animation: mascotaFlotar 3s ease-in-out infinite;
                }

                @keyframes mascotaFlotar {
                    0%,
                    100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-15px);
                    }
                }

                @media (max-width: 600px) {

                    .booty-container {
                        padding: 12px;
                    }

                    .booty-card {
                        padding: 16px;
                    }

                    .galeria-beneficios {
                        gap: 18px;
                    }

                    .tarjeta-beneficio {
    width: min(260px, 82vw);
}

                    .img-personaje {
                        width: 125px;
                    }
                }

            </style>


            <div class="booty-container">

                ${window.GymApp.renderLogo()}

                <h2
                    style="
                        text-align:center;
                        color:#ff9a8b;
                        margin-bottom:25px;
                    "
                >
                    BOOTY CLUB
                </h2>


                <div class="booty-card">

                    <h3>Beneficiarias Activas</h3>

                    <div id="lista-beneficiarias">
                        Cargando beneficiarias...
                    </div>

                </div>


                <div class="booty-card">

                    <h3>BENEFICIOS</h3>

                    ${
                        esAdmin
                            ? `
                                <div class="form-beneficio">

                                    <div
                                        style="
                                            color:#ff9a8b;
                                            font-weight:800;
                                            margin-bottom:4px;
                                        "
                                    >
                                        + Agregar beneficio
                                    </div>

                                    <div
                                        style="
                                            color:#999;
                                            font-size:.82rem;
                                            line-height:1.4;
                                        "
                                    >
                                        Elegí una imagen y escribí una descripción breve.
                                        Podés publicar todos los beneficios que necesites.
                                    </div>

                                    <textarea
                                        id="descripcion-beneficio"
                                        maxlength="250"
                                        placeholder="Ej.: 20% de descuento en masajes durante todo el mes."
                                    ></textarea>

                                    <input
                                        type="file"
                                        id="imagen-beneficio"
                                        accept="image/jpeg,image/png,image/webp"
                                    >

                                    <button
                                        id="btn-publicar-beneficio"
                                        class="btn-publicar-beneficio"
                                    >
                                        PUBLICAR BENEFICIO
                                    </button>

                                </div>
                            `
                            : `
                                <p
                                    style="
                                        color:#aaa;
                                        font-size:.84rem;
                                        text-align:center;
                                        margin:0 0 15px;
                                    "
                                >
                                    Beneficios disponibles para las socias activas.
                                </p>
                            `
                    }

                    <div
                        id="contenedor-beneficios"
                        class="galeria-beneficios"
                    >
                        <div class="sin-beneficios">
                            Cargando beneficios...
                        </div>
                    </div>

                </div>

            </div>


            <div
                class="mascota-wrapper"
                id="booty-mascota"
            >

                <div
                    class="burbuja"
                    id="burbuja-frase"
                ></div>

                <img
                    src="mascota.png"
                    class="img-personaje"
                    alt="Mascota"
                >

            </div>
        `;


        if (esAdmin) {

            const botonPublicar =
                document.getElementById(
                    'btn-publicar-beneficio'
                );

            if (botonPublicar) {

                botonPublicar.onclick =
                    () => this.agregarBeneficio();
            }
        }


        const mascota =
            document.getElementById(
                'booty-mascota'
            );

        if (mascota) {

            mascota.onclick =
                () => this.mostrarFraseAliento();
        }


        this.renderizarListasBooty();

        this.actualizarGaleria();

        this.mostrarFraseAliento();
    },


    mostrarFraseAliento: function() {

        const frases = [
            '¡Hoy es el día para dar tu 100%! 🍑',
            '¡Cada entrenamiento cuenta!',
            'Tu esfuerzo de hoy es tu éxito de mañana.',
            '¡Tu mejor versión se construye con constancia!',
            '¡No te detengas hasta estar orgullosa!',
            '¡Respirá, entrená y conquistá tu día!',
            '¡Tu disciplina es tu superpoder!',
            '¡Suda hoy, brilla siempre!',
            '¡La constancia es la llave!',
            '¡Hoy superás tus propios límites!',
            '¡Sos capaz de lograrlo!'
        ];

        const el =
            document.getElementById(
                'burbuja-frase'
            );

        if (el) {

            el.innerText =
                frases[
                    Math.floor(
                        Math.random() *
                        frases.length
                    )
                ];
        }
    },


    agregarBeneficio: async function() {

        if (!this.esAdminPrincipal()) {

            alert(
                'No tenés permisos para agregar beneficios.'
            );

            return;
        }


        const inputImagen =
            document.getElementById(
                'imagen-beneficio'
            );

        const inputDescripcion =
            document.getElementById(
                'descripcion-beneficio'
            );

        const boton =
            document.getElementById(
                'btn-publicar-beneficio'
            );


        const archivo =
            inputImagen?.files?.[0];

        const descripcion =
            String(
                inputDescripcion?.value || ''
            ).trim();


        if (!archivo) {

            alert(
                'Seleccioná una imagen para el beneficio.'
            );

            return;
        }


        if (!descripcion) {

            alert(
                'Escribí una breve descripción del beneficio.'
            );

            return;
        }


        const token =
            this.obtenerToken();

        if (!token) {

            alert(
                'La sesión administrativa venció.'
            );

            return;
        }


        const formData =
            new FormData();

        formData.append(
            'imagen',
            archivo
        );

        formData.append(
            'descripcion',
            descripcion
        );


        const textoOriginal =
            boton?.textContent || '';

        try {

            if (boton) {

                boton.disabled = true;

                boton.textContent =
                    'PUBLICANDO...';
            }


            const response =
                await fetch(
                    `${this.apiBase}/booty-club/beneficios/upload`,
                    {
                        method: 'POST',

                        headers: {
                            'Authorization':
                                `Bearer ${token}`
                        },

                        body: formData
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    'No fue posible publicar el beneficio.'
                );
            }


            if (inputImagen) {
                inputImagen.value = '';
            }

            if (inputDescripcion) {
                inputDescripcion.value = '';
            }


            await this.actualizarGaleria();


        } catch (error) {

            console.error(
                'Error al agregar beneficio:',
                error
            );

            alert(
                error.message ||
                'No se pudo publicar el beneficio.'
            );

        } finally {

            if (boton) {

                boton.disabled = false;

                boton.textContent =
                    textoOriginal ||
                    'PUBLICAR BENEFICIO';
            }
        }
    },


    actualizarGaleria: async function() {

        const contenedor =
            document.getElementById(
                'contenedor-beneficios'
            );

        if (!contenedor) return;


        const token =
            this.obtenerToken();

        if (!token) {

            contenedor.innerHTML = `
                <div class="sin-beneficios">
                    La sesión administrativa venció.
                </div>
            `;

            return;
        }


        try {

            const response =
                await fetch(
                    `${this.apiBase}/booty-club/beneficios`,
                    {
                        headers: {
                            'Authorization':
                                `Bearer ${token}`
                        }
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    'No fue posible cargar los beneficios.'
                );
            }


            const beneficios =
                Array.isArray(data.beneficios)
                    ? data.beneficios
                    : [];


            if (!beneficios.length) {

                contenedor.innerHTML = `
                    <div class="sin-beneficios">
                        Todavía no hay beneficios publicados.
                    </div>
                `;

                return;
            }


            const esAdmin =
                this.esAdminPrincipal();


            contenedor.innerHTML =
                beneficios
                    .map(beneficio => `

                        <div class="tarjeta-beneficio">

                            ${
                                esAdmin
                                    ? `
                                        <button
                                            class="btn-eliminar-beneficio"
                                            title="Eliminar beneficio"
                                            onclick="window.GymApp.bootyclub.eliminarBeneficio(${Number(beneficio.id)})"
                                        >
                                            ×
                                        </button>
                                    `
                                    : ''
                            }

                            <img
                                src="${this.escaparHTML(beneficio.imagen_url)}"
                                alt="Beneficio Booty Club"
                                loading="lazy"
                            >

                            <div class="descripcion-beneficio">
                                ${this.escaparHTML(
                                    beneficio.descripcion ||
                                    'Beneficio Booty Club'
                                )}
                            </div>

                        </div>

                    `)
                    .join('');


        } catch (error) {

            console.error(
                'Error cargando beneficios:',
                error
            );

            contenedor.innerHTML = `
                <div class="sin-beneficios">
                    No se pudieron cargar los beneficios.
                </div>
            `;
        }
    },


    eliminarBeneficio: async function(id) {

        if (!this.esAdminPrincipal()) {

            alert(
                'No tenés permisos para eliminar beneficios.'
            );

            return;
        }


        const confirmar =
            confirm(
                '¿Querés eliminar este beneficio? Dejará de mostrarse para empleadas y socias.'
            );

        if (!confirmar) return;


        const token =
            this.obtenerToken();

        if (!token) {

            alert(
                'La sesión administrativa venció.'
            );

            return;
        }


        try {

            const response =
                await fetch(
                    `${this.apiBase}/booty-club/beneficios/${id}`,
                    {
                        method: 'DELETE',

                        headers: {
                            'Authorization':
                                `Bearer ${token}`
                        }
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    'No fue posible eliminar el beneficio.'
                );
            }


            await this.actualizarGaleria();


        } catch (error) {

            console.error(
                'Error eliminando beneficio:',
                error
            );

            alert(
                error.message ||
                'No se pudo eliminar el beneficio.'
            );
        }
    },


    renderizarListasBooty: async function() {

        const contenedor =
            document.getElementById(
                'lista-beneficiarias'
            );

        if (!contenedor) return;


        try {

            const token =
                this.obtenerToken();

            const urlPagos =
                `${this.apiBase}/pagos`;


            const res =
                await fetch(
                    urlPagos,
                    {
                        headers: {
                            'Content-Type':
                                'application/json',

                            'Authorization':
                                `Bearer ${token || ''}`
                        }
                    }
                );


            if (!res.ok) {

                throw new Error(
                    'Error al obtener pagos'
                );
            }


            const todosLosPagos =
                await res.json();


            const hoy =
                new Date();

            const mesActual =
                hoy.getMonth() + 1;

            const anioActual =
                hoy.getFullYear();


            /*
             * Conservamos temporalmente la lógica actual
             * de la lista administrativa.
             *
             * En el siguiente paso vamos a cambiarla
             * para que represente "socias activas"
             * y no solamente pagos del día 1 al 10.
             */

            const beneficiarias =
                todosLosPagos.filter(p => {

                    const fechaP =
                        new Date(
                            p.fecha_pago ||
                            p.created_at
                        );

                    return (
                        fechaP.getMonth() + 1
                    ) === mesActual &&
                    fechaP.getFullYear() ===
                        anioActual &&
                    fechaP.getDate() >= 1 &&
                    fechaP.getDate() <= 10;
                });


            const unicas = {};


            beneficiarias.forEach(p => {

                if (p.clienta_id) {

                    unicas[p.clienta_id] =
                        p.nombre_completo ||
                        'Clienta';
                }
            });


            const listaNombres =
                Object.values(unicas);


            contenedor.innerHTML =
                listaNombres.length > 0
                    ? listaNombres
                        .map(nombre => `
                            <div class="beneficiaria-item">
                                <span class="badge">
                                    ACTIVA
                                </span>

                                <span>
                                    ${this.escaparHTML(nombre)}
                                </span>
                            </div>
                        `)
                        .join('')
                    : `
                        <p
                            style="
                                color:#bbb;
                                text-align:center;
                            "
                        >
                            No hay beneficiarias registradas para este período.
                        </p>
                    `;


        } catch (error) {

            console.error(
                'Error al cargar beneficiarias:',
                error
            );

            contenedor.innerHTML = `
                <p
                    style="
                        color:#bbb;
                        text-align:center;
                    "
                >
                    Error al cargar datos.
                </p>
            `;
        }
    }
};
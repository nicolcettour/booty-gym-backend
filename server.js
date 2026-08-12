require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta raíz requerida para mantener activo UptimeRobot en Render
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Backend de Booty Gym activo'
    });
});

// Configuración genérica y universal compatible con Gmail, Outlook y Yahoo
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Constante de control
const GIMNASIO_ACTUAL = 'BOOTY_GYM_001';

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

// Función auxiliar segura para poner la primera letra en mayúscula
const capitalizar = (str) => {
    if (!str) return '';

    return str
        .trim()
        .toLowerCase()
        .replace(
            /(^\w{1})|(\s+\w{1})/g,
            letra => letra.toUpperCase()
        );
};

// Función auxiliar para formatear la altura automáticamente
const formatearAlturaServidor = (val) => {
    if (!val) return null;

    let str = String(val).trim().replace(',', '.');

    if (!str.includes('.') && str.length === 3) {
        return str[0] + '.' + str.slice(1);
    }

    return str;
};

// ============================================================
// SEGURIDAD - CUENTAS DE SOCIAS
// ============================================================

// Genera un hash seguro para las contraseñas.
// Utilizamos crypto nativo de Node.js para no agregar dependencias.
const generarHashPassword = async (password) => {
    return new Promise((resolve, reject) => {

        const salt = crypto.randomBytes(16).toString('hex');

        crypto.scrypt(
            password,
            salt,
            64,
            (err, derivedKey) => {

                if (err) {
                    reject(err);
                    return;
                }

                resolve(
                    `${salt}:${derivedKey.toString('hex')}`
                );
            }
        );
    });
};

// Comprueba una contraseña contra el hash almacenado
const verificarPassword = async (password, hashGuardado) => {

    try {

        if (!hashGuardado || !hashGuardado.includes(':')) {
            return false;
        }

        const [salt, hash] = hashGuardado.split(':');

        return new Promise((resolve, reject) => {

            crypto.scrypt(
                password,
                salt,
                64,
                (err, derivedKey) => {

                    if (err) {
                        reject(err);
                        return;
                    }

                    const hashBuffer =
                        Buffer.from(hash, 'hex');

                    const derivedBuffer =
                        Buffer.from(derivedKey);

                    if (
                        hashBuffer.length !==
                        derivedBuffer.length
                    ) {
                        resolve(false);
                        return;
                    }

                    resolve(
                        crypto.timingSafeEqual(
                            hashBuffer,
                            derivedBuffer
                        )
                    );
                }
            );
        });

    } catch (error) {

        console.error(
            'Error al verificar contraseña:',
            error
        );

        return false;
    }
};

// Genera un token de sesión firmado
const generarTokenSesion = (clientaId) => {

    const payload = {
        clienta_id: clientaId,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };

    const payloadBase64 = Buffer
        .from(JSON.stringify(payload))
        .toString('base64url');

    const secret =
        process.env.CLIENTAS_AUTH_SECRET ||
        'BOOTY_GYM_SOCIAS_SECRET_CAMBIAR_EN_PRODUCCION';

    const firma = crypto
        .createHmac('sha256', secret)
        .update(payloadBase64)
        .digest('base64url');

    return `${payloadBase64}.${firma}`;
};

// Verifica el token de sesión
const verificarTokenSesion = (token) => {

    try {

        if (!token) {
            return null;
        }

        const partes = token.split('.');

        if (partes.length !== 2) {
            return null;
        }

        const [payloadBase64, firma] = partes;

        const secret =
            process.env.CLIENTAS_AUTH_SECRET ||
            'BOOTY_GYM_SOCIAS_SECRET_CAMBIAR_EN_PRODUCCION';

        const firmaEsperada = crypto
            .createHmac('sha256', secret)
            .update(payloadBase64)
            .digest('base64url');

        const firmaBuffer =
            Buffer.from(firma, 'utf8');

        const firmaEsperadaBuffer =
            Buffer.from(firmaEsperada, 'utf8');

        if (
            firmaBuffer.length !==
            firmaEsperadaBuffer.length
        ) {
            return null;
        }

        if (
            !crypto.timingSafeEqual(
                firmaBuffer,
                firmaEsperadaBuffer
            )
        ) {
            return null;
        }

        const payload = JSON.parse(
            Buffer
                .from(payloadBase64, 'base64url')
                .toString('utf8')
        );

        if (!payload.clienta_id || !payload.exp) {
            return null;
        }

        if (Date.now() > payload.exp) {
            return null;
        }

        return payload;

    } catch (error) {

        console.error(
            'Error al verificar token:',
            error
        );

        return null;
    }
};

// Obtiene el token enviado en Authorization
const obtenerToken = (req) => {

    const authorization =
        req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
        return null;
    }

    return authorization.substring(7);
};

// ============================================================
// RUTAS DE CLIENTAS
// ============================================================

app.get('/clientas', async (req, res) => {

    try {

        const result = await db.query(
            'SELECT * FROM clientas WHERE gym_id = $1 ORDER BY nombre ASC, apellido ASC',
            [GIMNASIO_ACTUAL]
        );

        res.status(200).json(result.rows);

    } catch (err) {

        console.error(
            "Error al obtener clientas:",
            err
        );

        res.status(500).json({
            error: 'Error al obtener clientas'
        });
    }
});


// ------------------------------------------------------------
// CREAR CLIENTA
// ------------------------------------------------------------
app.post('/clientas', async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            dni,
            email,
            contacto,
            ubicacion,
            peso,
            altura,
            horario,
            dias,
            busto,
            cintura,
            cadera,
            abductores,
            cuadriceps,
            gemelos,
            salud,
            objetivo
        } = req.body;

        const nombreFormateado = capitalizar(nombre);
        const apellidoFormateado = capitalizar(apellido);
        const alturaFormateada = formatearAlturaServidor(altura);

        const diasTexto = Array.isArray(dias)
            ? dias.join(', ')
            : (dias || '');

        console.log("Datos recibidos para guardar:", { dni, email, nombre: nombreFormateado });

        const query = `
            INSERT INTO clientas
            (
                nombre,
                apellido,
                dni,
                email,
                contacto,
                ubicacion,
                peso,
                altura,
                horario,
                dias,
                busto,
                cintura,
                cadera,
                abductores,
                cuadriceps,
                gemelos,
                salud,
                objetivo,
                gym_id
            )
            VALUES
            (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19
            )
            RETURNING *
        `;

        const values = [
            nombreFormateado,           // $1
            apellidoFormateado,         // $2
            dni || '',                  // $3
            email || '',                // $4
            contacto || '',             // $5
            ubicacion || '',            // $6
            peso || null,               // $7
            alturaFormateada || null,   // $8
            horario || '',              // $9
            diasTexto,                  // $10
            busto || null,              // $11
            cintura || null,            // $12
            cadera || null,             // $13
            abductores || null,         // $14
            cuadriceps || null,         // $15
            gemelos || null,            // $16
            salud || 'no',              // $17
            objetivo || '',             // $18
            GIMNASIO_ACTUAL             // $19
        ];

        const result = await db.query(query, values);

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error("Error al guardar clienta:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// ------------------------------------------------------------
// MODIFICAR CLIENTA
// ------------------------------------------------------------

app.put('/clientas/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const body = req.body;

        const nombreFormateado =
            capitalizar(body.nombre);

        const apellidoFormateado =
            capitalizar(body.apellido);

        const dni =
            body.dni || '';

        const email =
            body.email || '';

        const contacto =
            body.contacto || '';

        const ubicacion =
            body.ubicacion ||
            body.ubicación ||
            '';

        const peso =
            body.peso || null;

        const altura =
            formatearAlturaServidor(
                body.altura
            );

        const horario =
            body.horario || '';

        const dias =
            body.dias ||
            body.días ||
            '';

        const diasTexto =
            Array.isArray(dias)
                ? dias.join(', ')
                : (dias || '');

        const busto =
            body.busto || null;

        const cintura =
            body.cintura || null;

        const cadera =
            body.cadera || null;

        const abductores =
            body.abductores ||
            body.abductor ||
            null;

        const cuadriceps =
            body.cuadriceps ||
            body.cuádriceps ||
            null;

        const gemelos =
            body.gemelos || null;

        const salud =
            body.salud || 'no';

        const objetivo =
            body.objetivo || '';

        const query = `
            UPDATE clientas
            SET
                nombre=$1,
                apellido=$2,
                dni=$3,
                email=$4,
                contacto=$5,
                ubicacion=$6,
                peso=$7,
                altura=$8,
                horario=$9,
                dias=$10,
                busto=$11,
                cintura=$12,
                cadera=$13,
                abductores=$14,
                cuadriceps=$15,
                gemelos=$16,
                salud=$17,
                objetivo=$18
            WHERE id=$19
            AND gym_id=$20
        `;

        const values = [

            nombreFormateado,
            apellidoFormateado,
            dni,
            email,
            contacto,
            ubicacion,
            peso,
            altura,
            horario,
            diasTexto,
            busto,
            cintura,
            cadera,
            abductores,
            cuadriceps,
            gemelos,
            salud,
            objetivo,
            id,
            GIMNASIO_ACTUAL

        ];

        await db.query(
            query,
            values
        );

        res.status(200).json({
            success: true,
            message:
                'Ficha actualizada correctamente'
        });

    } catch (err) {

        console.error(
            "Error al actualizar clienta:",
            err.message
        );

        res.status(500).json({
            error: err.message
        });
    }
});


// ------------------------------------------------------------
// ELIMINAR CLIENTA
// ------------------------------------------------------------

app.delete('/clientas/:id', async (req, res) => {

    try {

        const { id } = req.params;

        await db.query(
            'DELETE FROM pagos WHERE clienta_id = $1 AND gym_id = $2',
            [id, GIMNASIO_ACTUAL]
        );

        const query =
            'DELETE FROM clientas WHERE id = $1 AND gym_id = $2';

        const result =
            await db.query(
                query,
                [id, GIMNASIO_ACTUAL]
            );

        if (result.rowCount === 0) {

            return res.status(404).json({
                error: 'Clienta no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message:
                'Clienta eliminada correctamente'
        });

    } catch (err) {

        console.error(
            "Error al eliminar clienta:",
            err
        );

        res.status(500).json({
            error: 'Error al eliminar clienta'
        });
    }
});


// ============================================================
// AUTENTICACIÓN DE SOCIAS
// ============================================================

// ------------------------------------------------------------
// REGISTRO DE SOCIA
// ------------------------------------------------------------

app.post('/clientas/auth/register', async (req, res) => {

    try {

        const {
            dni,
            email,
            password
        } = req.body;

        if (!dni || !email || !password) {

            return res.status(400).json({
                error:
                    'DNI, email y contraseña son obligatorios.'
            });
        }

        if (password.length < 8) {

            return res.status(400).json({
                error:
                    'La contraseña debe tener al menos 8 caracteres.'
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        // La socia debe existir previamente
        // en el sistema administrativo.
        const clientaResult =
            await db.query(
                `
                SELECT *
                FROM clientas
                WHERE dni = $1
                AND LOWER(email) = $2
                AND gym_id = $3
                LIMIT 1
                `,
                [
                    dni.trim(),
                    emailNormalizado,
                    GIMNASIO_ACTUAL
                ]
            );

        if (clientaResult.rows.length === 0) {

            return res.status(404).json({
                error:
                    'No encontramos una socia registrada con ese DNI y email. Verificá los datos con el gimnasio.'
            });
        }

        const clienta =
            clientaResult.rows[0];

        // Comprobar si ya tiene cuenta
        const cuentaExistente =
            await db.query(
                `
                SELECT id
                FROM clientas_auth
                WHERE clienta_id = $1
                `,
                [clienta.id]
            );

        if (cuentaExistente.rows.length > 0) {

            return res.status(409).json({
                error:
                    'Esta socia ya tiene una cuenta creada.'
            });
        }

        const passwordHash =
            await generarHashPassword(
                password
            );

        await db.query(
            `
            INSERT INTO clientas_auth
            (
                clienta_id,
                email,
                password_hash
            )
            VALUES ($1, $2, $3)
            `,
            [
                clienta.id,
                emailNormalizado,
                passwordHash
            ]
        );

        res.status(201).json({
            success: true,
            message:
                'Cuenta creada correctamente.'
        });

    } catch (err) {

        console.error(
            'Error en registro de socia:',
            err
        );

        res.status(500).json({
            error:
                'No fue posible crear la cuenta.'
        });
    }
});


// ------------------------------------------------------------
// LOGIN DE SOCIA
// ------------------------------------------------------------

app.post('/clientas/auth/login', async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                error:
                    'Email y contraseña son obligatorios.'
            });
        }

   const emailNormalizado =
            email.trim().toLowerCase();

        console.log("-----------------------------------------");
        console.log("INTENTO DE REGISTRO DESDE LA APP:");
        console.log("DNI que llegó:", JSON.stringify(dni));
        console.log("Email que llegó:", JSON.stringify(emailNormalizado));
        console.log("Gym ID actual:", GIMNASIO_ACTUAL);
        console.log("-----------------------------------------");

        const clientaResult = await db.query(
            `
            SELECT *
            FROM clientas
            WHERE dni = $1
            AND LOWER(email) = $2
            AND gym_id = $3
            LIMIT 1
            `,
            [
                dni.trim(),
                emailNormalizado,
                GIMNASIO_ACTUAL
            ]
        );
        if (result.rows.length === 0) {

            return res.status(401).json({
                error:
                    'Email o contraseña incorrectos.'
            });
        }

        const cuenta =
            result.rows[0];

        const passwordCorrecta =
            await verificarPassword(
                password,
                cuenta.password_hash
            );

        if (!passwordCorrecta) {

            return res.status(401).json({
                error:
                    'Email o contraseña incorrectos.'
            });
        }

        const token =
            generarTokenSesion(
                cuenta.clienta_id
            );

        const clienta = {
            id: cuenta.clienta_id,
            nombre: cuenta.nombre,
            apellido: cuenta.apellido,
            dni: cuenta.dni,
            email: cuenta.email,
            contacto: cuenta.contacto,
            ubicacion: cuenta.ubicacion,
            peso: cuenta.peso,
            altura: cuenta.altura,
            horario: cuenta.horario,
            dias: cuenta.dias,
            busto: cuenta.busto,
            cintura: cuenta.cintura,
            cadera: cuenta.cadera,
            abductores: cuenta.abductores,
            cuadriceps: cuenta.cuadriceps,
            gemelos: cuenta.gemelos,
            salud: cuenta.salud,
            objetivo: cuenta.objetivo,
            estado: cuenta.estado,
            fecha_pago: cuenta.fecha_pago,
            monto_cuota: cuenta.monto_cuota
        };

        res.status(200).json({
            success: true,
            token,
            clienta
        });

    } catch (err) {

        console.error(
            'Error en login de socia:',
            err
        );

        res.status(500).json({
            error:
                'Error interno del servidor.'
        });
    }
});


// ------------------------------------------------------------
// SESIÓN ACTUAL
// ------------------------------------------------------------

app.get('/clientas/auth/me', async (req, res) => {

    try {

        const token =
            obtenerToken(req);

        const payload =
            verificarTokenSesion(token);

        if (!payload) {

            return res.status(401).json({
                error:
                    'Sesión inválida o expirada.'
            });
        }

        const result =
            await db.query(
                `
                SELECT
                    c.*
                FROM clientas c
                WHERE c.id = $1
                AND c.gym_id = $2
                LIMIT 1
                `,
                [
                    payload.clienta_id,
                    GIMNASIO_ACTUAL
                ]
            );

        if (result.rows.length === 0) {

            return res.status(401).json({
                error:
                    'La socia ya no existe.'
            });
        }

        const clienta =
            result.rows[0];

        res.status(200).json({
            success: true,
            clienta
        });

    } catch (err) {

        console.error(
            'Error al comprobar sesión:',
            err
        );

        res.status(500).json({
            error:
                'Error interno del servidor.'
        });
    }
});


// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

app.post('/clientas/auth/logout', async (req, res) => {

    // La sesión es almacenada en el navegador.
    // El frontend elimina el token al cerrar sesión.
    res.status(200).json({
        success: true,
        message:
            'Sesión cerrada correctamente.'
    });
});


// ------------------------------------------------------------
// SOLICITAR RECUPERACIÓN
// ------------------------------------------------------------

app.post('/clientas/auth/request-reset', async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {

            return res.status(400).json({
                error:
                    'El email es obligatorio.'
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const result =
            await db.query(
                `
                SELECT
                    ca.id,
                    ca.clienta_id,
                    ca.email,
                    c.nombre,
                    c.apellido
                FROM clientas_auth ca
                INNER JOIN clientas c
                    ON c.id = ca.clienta_id
                WHERE LOWER(ca.email) = $1
                AND c.gym_id = $2
                LIMIT 1
                `,
                [
                    emailNormalizado,
                    GIMNASIO_ACTUAL
                ]
            );

        // No revelamos si el email existe.
        if (result.rows.length === 0) {

            return res.status(200).json({
                success: true,
                message:
                    'Si el email está registrado, recibirás un código de recuperación.'
            });
        }

        const cuenta =
            result.rows[0];

        const codigo =
            crypto
                .randomInt(100000, 1000000)
                .toString();

        const expiracion =
            new Date(
                Date.now() +
                (15 * 60 * 1000)
            );

        await db.query(
            `
            UPDATE clientas_auth
            SET
                reset_code = $1,
                reset_code_expires_at = $2
            WHERE id = $3
            `,
            [
                codigo,
                expiracion,
                cuenta.id
            ]
        );

        await transporter.sendMail({

            from:
                process.env.EMAIL_USER,

            to:
                cuenta.email,

            subject:
                'Booty Gym | Código de recuperación',

            text:
                `Hola ${cuenta.nombre} ${cuenta.apellido}.

Tu código de recuperación de Booty Gym es:

${codigo}

Este código vence en 15 minutos.

Si no solicitaste recuperar tu contraseña, podés ignorar este mensaje.`

        });

        console.log(
            `[RECUPERACIÓN SOCIA] Código enviado a ${cuenta.email}`
        );

        res.status(200).json({
            success: true,
            message:
                'Si el email está registrado, recibirás un código de recuperación.'
        });

    } catch (err) {

        console.error(
            'Error al solicitar recuperación:',
            err
        );

        res.status(500).json({
            error:
                'No fue posible solicitar la recuperación.'
        });
    }
});


// ------------------------------------------------------------
// CAMBIAR CONTRASEÑA
// ------------------------------------------------------------

app.post('/clientas/auth/reset-password', async (req, res) => {

    try {

        const {
            email,
            code,
            password
        } = req.body;

        if (!email || !code || !password) {

            return res.status(400).json({
                error:
                    'Email, código y nueva contraseña son obligatorios.'
            });
        }

        if (password.length < 8) {

            return res.status(400).json({
                error:
                    'La contraseña debe tener al menos 8 caracteres.'
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const result =
            await db.query(
                `
                SELECT
                    ca.id
                FROM clientas_auth ca
                INNER JOIN clientas c
                    ON c.id = ca.clienta_id
                WHERE LOWER(ca.email) = $1
                AND ca.reset_code = $2
                AND ca.reset_code_expires_at > NOW()
                AND c.gym_id = $3
                LIMIT 1
                `,
                [
                    emailNormalizado,
                    code.trim(),
                    GIMNASIO_ACTUAL
                ]
            );

        if (result.rows.length === 0) {

            return res.status(401).json({
                error:
                    'El código es incorrecto o ya venció.'
            });
        }

        const passwordHash =
            await generarHashPassword(
                password
            );

        await db.query(
            `
            UPDATE clientas_auth
            SET
                password_hash = $1,
                reset_code = NULL,
                reset_code_expires_at = NULL
            WHERE id = $2
            `,
            [
                passwordHash,
                result.rows[0].id
            ]
        );

        res.status(200).json({
            success: true,
            message:
                'Contraseña actualizada correctamente.'
        });

    } catch (err) {

        console.error(
            'Error al cambiar contraseña:',
            err
        );

        res.status(500).json({
            error:
                'No fue posible cambiar la contraseña.'
        });
    }
});


// ============================================================
// RUTAS DE PAGOS
// ============================================================

app.get('/pagos', async (req, res) => {

    try {

        const result = await db.query(
            'SELECT * FROM pagos WHERE gym_id = $1 ORDER BY id DESC',
            [GIMNASIO_ACTUAL]
        );

        res.status(200).json(result.rows);

    } catch (err) {

        console.error(
            "Error al obtener historial:",
            err
        );

        res.status(500).send(
            'Error al obtener historial'
        );
    }
});


app.get('/pagos/agrupados', async (req, res) => {

    try {

        const query = `
            SELECT
                id,
                monto,
                nombre_completo,
                fecha_pago,
                EXTRACT(YEAR FROM fecha_pago) as anio,
                EXTRACT(MONTH FROM fecha_pago) as mes
            FROM pagos
            WHERE gym_id = $1
            ORDER BY fecha_pago DESC
        `;

        const result =
            await db.query(
                query,
                [GIMNASIO_ACTUAL]
            );

        res.json(result.rows);

    } catch (err) {

        console.error(
            "ERROR EN SQL:",
            err.message
        );

        res.status(500).json({
            error: err.message
        });
    }
});


app.post('/pagos', async (req, res) => {

    try {

        const {
            gym_id,
            clienta_id,
            monto,
            mes,
            anio,
            nombre_completo,
            usuario_registro,
            fecha_pago
        } = req.body;

        const query = `
            INSERT INTO pagos
            (
                gym_id,
                clienta_id,
                monto,
                mes,
                anio,
                nombre_completo,
                usuario_registro,
                fecha_pago
            )
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await db.query(
            query,
            [
                gym_id || 'BOOTY_GYM_001',
                clienta_id,
                monto,
                mes || new Date().getMonth() + 1,
                anio || new Date().getFullYear(),
                nombre_completo || '',
                usuario_registro || 'Admin',
                fecha_pago || new Date()
            ]
        );

        res.status(200).json({
            status: 'success',
            message:
                'Pago registrado correctamente'
        });

    } catch (error) {

        console.error(
            "Error al registrar pago:",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
});


// ============================================================
// RUTAS CONFIGURACIÓN
// ============================================================

app.get('/config', async (req, res) => {

    try {

        const idGym =
            req.query.gym_id ||
            'BOOTY_GYM_001';

        const resultado =
            await db.query(
                'SELECT * FROM configuracion WHERE gym_id = $1',
                [idGym]
            );

        if (resultado.rows.length > 0) {

            res.json(
                resultado.rows[0]
            );

        } else {

            res.json({

                monto_2dias: 30000,
                monto_3dias: 35000,
                monto_4dias: 40000,
                monto_5dias: 45000,
                interes: 10

            });
        }

    } catch (err) {

        console.error(
            "Error al obtener config:",
            err
        );

        res.status(500).send(
            'Error al obtener configuración'
        );
    }
});


app.post('/config', async (req, res) => {

    const {
        gym_id,
        monto_2dias,
        monto_3dias,
        monto_4dias,
        monto_5dias,
        interes
    } = req.body;

    const idGym =
        gym_id || 'general';

    console.log(
        "DATOS RECIBIDOS EN CONFIG:",
        {
            idGym,
            monto_2dias,
            monto_3dias,
            monto_4dias,
            monto_5dias,
            interes
        }
    );

    try {

        const existe =
            await db.query(
                'SELECT * FROM configuracion WHERE gym_id = $1',
                [idGym]
            );

        if (existe.rows.length > 0) {

            await db.query(
                `
                UPDATE configuracion
                SET
                    monto_2dias = $1,
                    monto_3dias = $2,
                    monto_4dias = $3,
                    monto_5dias = $4,
                    interes = $5
                WHERE gym_id = $6
                `,
                [
                    monto_2dias,
                    monto_3dias,
                    monto_4dias,
                    monto_5dias,
                    interes,
                    idGym
                ]
            );

        } else {

            await db.query(
                `
                INSERT INTO configuracion
                (
                    gym_id,
                    monto_2dias,
                    monto_3dias,
                    monto_4dias,
                    monto_5dias,
                    interes
                )
                VALUES
                ($1, $2, $3, $4, $5, $6)
                `,
                [
                    idGym,
                    monto_2dias,
                    monto_3dias,
                    monto_4dias,
                    monto_5dias,
                    interes
                ]
            );
        }

        res.status(200).send(
            'Configuración guardada'
        );

    } catch (err) {

        console.error(
            "Error al guardar config:",
            err
        );

        res.status(500).send(
            'Error al guardar configuración'
        );
    }
});


// ============================================================
// RUTAS DE USUARIO ADMINISTRATIVO
// ============================================================

app.post('/login', async (req, res) => {

    try {

        const {
            user,
            pass
        } = req.body;

        const result =
            await db.query(
                `
                SELECT username, gym_id
                FROM usuarios
                WHERE username = $1
                AND password_hash = $2
                `,
                [
                    user,
                    pass
                ]
            );

        if (result.rows.length > 0) {

            res.status(200).json({

                success: true,

                gym_id:
                    result.rows[0].gym_id,

                username:
                    result.rows[0].username

            });

        } else {

            res.status(401).json({
                success: false,
                message:
                    'Usuario o contraseña incorrectos'
            });
        }

    } catch (err) {

        console.error(
            "Error en login:",
            err
        );

        res.status(500).send(
            'Error en el servidor'
        );
    }
});


app.post('/register', async (req, res) => {

    try {

        const {
            user,
            pass,
            email
        } = req.body;

        await db.query(
            `
            INSERT INTO usuarios
            (
                username,
                password_hash,
                gym_id,
                email
            )
            VALUES ($1, $2, $3, $4)
            `,
            [
                user,
                pass,
                GIMNASIO_ACTUAL,
                email
            ]
        );

        res.status(201).json({
            success: true
        });

    } catch (err) {

        console.error(
            "Error al registrar:",
            err
        );

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});


app.post('/solicitar-codigo', async (req, res) => {

    const { username } = req.body;

    try {

        const userResult =
            await db.query(
                'SELECT * FROM usuarios WHERE username = $1',
                [username]
            );

        if (userResult.rows.length === 0) {

            return res.json({
                success: false,
                message:
                    "Usuario no encontrado"
            });
        }

        const codigo =
            Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();

        await db.query(
            `
            UPDATE usuarios
            SET codigo_recuperacion = $1
            WHERE username = $2
            `,
            [
                codigo,
                username
            ]
        );

        console.log(
            `[RECUPERACIÓN] Código para ${username}: ${codigo}`
        );

        res.json({

            success: true,

            message:
                "Código generado con éxito."

        });

    } catch (err) {

        console.error(
            "Error al solicitar código:",
            err
        );

        res.status(500).json({

            success: false,

            message:
                "Error interno del servidor"

        });
    }
});


app.post('/verificar-y-cambiar', async (req, res) => {

    try {

        const {
            username,
            codigo,
            nuevaPass
        } = req.body;

        const result =
            await db.query(
                `
                SELECT *
                FROM usuarios
                WHERE username = $1
                AND codigo_recuperacion = $2
                `,
                [
                    username,
                    codigo
                ]
            );

        if (result.rows.length === 0) {

            return res.status(401).json({
                success: false,
                message:
                    'Código incorrecto'
            });
        }

        await db.query(
            `
            UPDATE usuarios
            SET
                password_hash = $1,
                codigo_recuperacion = NULL
            WHERE username = $2
            `,
            [
                nuevaPass,
                username
            ]
        );

        res.status(200).json({

            success: true,

            message:
                'Contraseña actualizada'

        });

    } catch (err) {

        console.error(
            "Error al cambiar contraseña:",
            err
        );

        res.status(500).send(
            'Error al cambiar contraseña'
        );
    }
});


// ============================================================
// CAJA CHICA
// ============================================================

app.get('/caja-chica', async (req, res) => {

    try {

        const { gym_id } =
            req.query;

        const gymActual =
            gym_id ||
            'BOOTY_GYM_001';

        const query = `
            SELECT *
            FROM pagos
            WHERE gym_id = $1
            ORDER BY id DESC
        `;

        const resultado =
            await db.query(
                query,
                [gymActual]
            );

        res.json(
            resultado.rows
        );

    } catch (err) {

        console.error(
            "Error al obtener caja chica:",
            err.message
        );

        res.status(500).json({
            error: err.message
        });
    }
});


// ============================================================
// INICIAR SERVIDOR
// ============================================================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () =>
        console.log(
            `Servidor activo en puerto ${PORT}`
        )
);
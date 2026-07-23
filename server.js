const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta raíz requerida para mantener activo UptimeRobot en Render y evitar el error "Cannot GET /"
app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Backend de Booty Gym activo' });
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

// Función auxiliar segura para poner la primera letra en mayúscula
const capitalizar = (str) => {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());
};

// Función auxiliar para formatear la altura automáticamente para la base de datos
const formatearAlturaServidor = (val) => {
    if (!val) return null;
    let str = String(val).trim().replace(',', '.');
    if (!str.includes('.') && str.length === 3) {
        return str[0] + '.' + str.slice(1);
    }
    return str;
};

// --- RUTAS DE CLIENTAS ---
app.get('/clientas', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM clientas WHERE gym_id = $1 ORDER BY nombre ASC, apellido ASC', 
            [GIMNASIO_ACTUAL]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error al obtener clientas:", err);
        res.status(500).json({ error: 'Error al obtener clientas' });
    }
});

app.post('/clientas', async (req, res) => {
    try {
        const { nombre, apellido, contacto, ubicacion, peso, altura, horario, dias, busto, cintura, cadera, abductores, cuadriceps, gemelos, salud, objetivo } = req.body;
        
        const nombreFormateado = capitalizar(nombre);
        const apellidoFormateado = capitalizar(apellido);
        const alturaFormateada = formatearAlturaServidor(altura); 
        const diasTexto = Array.isArray(dias) ? dias.join(', ') : (dias || '');

        const query = `INSERT INTO clientas (nombre, apellido, contacto, ubicacion, peso, altura, horario, dias, busto, cintura, cadera, abductores, cuadriceps, gemelos, salud, objetivo, gym_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`;
        
        const values = [
            nombreFormateado, apellidoFormateado, contacto || '', ubicacion || '', peso || null, 
            alturaFormateada || null, horario || '', diasTexto, busto || null, cintura || null, 
            cadera || null, abductores || null, cuadriceps || null, gemelos || null, 
            salud || 'no', objetivo || '', GIMNASIO_ACTUAL
        ];
        
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error al guardar clienta:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/clientas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        
        const nombreFormateado = capitalizar(body.nombre);
        const apellidoFormateado = capitalizar(body.apellido);
        const contacto = body.contacto || '';
        const ubicacion = body.ubicacion || body.ubicación || '';
        const peso = body.peso || null;
        const altura = formatearAlturaServidor(body.altura);
        const horario = body.horario || '';
        const dias = body.dias || body.días || '';
        const diasTexto = Array.isArray(dias) ? dias.join(', ') : (dias || '');
        
        const busto = body.busto || null;
        const cintura = body.cintura || null;
        const cadera = body.cadera || null;
        const abductores = body.abductores || body.abductor || null;
        const cuadriceps = body.cuadriceps || body.cuádriceps || null;
        const gemelos = body.gemelos || null;
        const salud = body.salud || 'no';
        const objetivo = body.objetivo || '';

        const query = `UPDATE clientas 
                       SET nombre=$1, apellido=$2, contacto=$3, ubicacion=$4, peso=$5, altura=$6, 
                           horario=$7, dias=$8, busto=$9, cintura=$10, cadera=$11, abductores=$12, 
                           cuadriceps=$13, gemelos=$14, salud=$15, objetivo=$16 
                       WHERE id = $17 AND gym_id = $18`;
        
        const values = [
            nombreFormateado, apellidoFormateado, contacto, ubicacion, peso, altura, horario, diasTexto, 
            busto, cintura, cadera, abductores, cuadriceps, gemelos, salud, objetivo, id, GIMNASIO_ACTUAL
        ];
        
        await db.query(query, values);
        res.status(200).json({ success: true, message: 'Ficha actualizada correctamente' });
    } catch (err) {
        console.error("Error al actualizar clienta:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/clientas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM pagos WHERE clienta_id = $1 AND gym_id = $2', [id, GIMNASIO_ACTUAL]);

        const query = 'DELETE FROM clientas WHERE id = $1 AND gym_id = $2';
        const result = await db.query(query, [id, GIMNASIO_ACTUAL]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Clienta no encontrada' });
        }
        
        res.status(200).json({ success: true, message: 'Clienta eliminada correctamente' });
    } catch (err) {
        console.error("Error al eliminar clienta:", err);
        res.status(500).json({ error: 'Error al eliminar clienta' });
    }
});

// --- RUTAS DE PAGOS ---
app.get('/pagos', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM pagos WHERE gym_id = $1 ORDER BY id DESC', [GIMNASIO_ACTUAL]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error al obtener historial:", err);
        res.status(500).send('Error al obtener historial');
    }
});

app.get('/pagos/agrupados', async (req, res) => {
    try {
        const query = `
            SELECT id, monto, nombre_completo, fecha_pago, 
            EXTRACT(YEAR FROM fecha_pago) as anio, 
            EXTRACT(MONTH FROM fecha_pago) as mes 
            FROM pagos 
            WHERE gym_id = $1 
            ORDER BY fecha_pago DESC`;
            
        const result = await db.query(query, [GIMNASIO_ACTUAL]);
        res.json(result.rows);
    } catch (err) {
        console.error("ERROR EN SQL:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/pagos', async (req, res) => {
    try {
        const { clienta_id, monto, concepto, nombre_completo } = req.body;
        
        const verificacion = await db.query(
            `SELECT id FROM pagos 
             WHERE clienta_id = $1 
               AND gym_id = $2 
               AND EXTRACT(YEAR FROM fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE) 
               AND EXTRACT(MONTH FROM fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE)`,
            [clienta_id, GIMNASIO_ACTUAL]
        );

        if (verificacion.rows.length > 0) {
            return res.status(400).json({ error: 'Esta clienta ya tiene un pago registrado este mes.' });
        }

        const query = `INSERT INTO pagos (clienta_id, monto, concepto, nombre_completo, gym_id, fecha_pago) 
                       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING *`;
        const values = [clienta_id, monto, concepto || 'Cuota Mensual', nombre_completo, GIMNASIO_ACTUAL];
        
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error al registrar pago:", err);
        res.status(500).json({ error: 'Error al registrar pago' });
    }
});

// --- RUTAS CONFIGURACIÓN ---
app.get('/config', async (req, res) => {
    try {
        const result = await db.query('SELECT monto_cuota, interes FROM configuracion WHERE gym_id = $1', [GIMNASIO_ACTUAL]);
        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(200).json({ monto_cuota: 0, interes: 0 });
        }
    } catch (err) {
        console.error("Error al obtener config:", err);
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});

app.post('/config', async (req, res) => {
    const { montoCuota, interesPorcentaje } = req.body;
    try {
        await db.query(
            'UPDATE configuracion SET monto_cuota = $1, interes = $2 WHERE gym_id = $3',
            [montoCuota, interesPorcentaje, GIMNASIO_ACTUAL]
        );
        res.status(200).send('Configuración guardada');
    } catch (err) {
        console.error("Error al guardar config:", err);
        res.status(500).send('Error al guardar configuración');
    }
});

// --- RUTAS DE USUARIO (LOGIN / REGISTER / RECUPERACIÓN) ---
app.post('/login', async (req, res) => {
    try {
        const { user, pass } = req.body;
        const result = await db.query('SELECT username, gym_id FROM usuarios WHERE username = $1 AND password_hash = $2', [user, pass]);
        
        if (result.rows.length > 0) {
            res.status(200).json({ 
                success: true, 
                gym_id: result.rows[0].gym_id,
                username: result.rows[0].username 
            });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).send('Error en el servidor');
    }
});

app.post('/register', async (req, res) => {
    try {
        const { user, pass, email } = req.body;
        await db.query(
            'INSERT INTO usuarios (username, password_hash, gym_id, email) VALUES ($1, $2, $3, $4)', 
            [user, pass, GIMNASIO_ACTUAL, email]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Error al registrar:", err);
        // CAMBIA ESTA LÍNEA TEMPORALMENTE:
        res.status(500).json({ success: false, error: err.message });
    }
});

// Ruta corregida usando 'db' y la tabla 'usuarios'
// Ruta usando la API HTTP de Brevo (Instantánea y sin bloqueos en Render)
app.post('/solicitar-codigo', async (req, res) => {
    const { username } = req.body;
    try {
        const userResult = await db.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.json({ success: false, message: "Usuario no encontrado" });
        }

        const emailDestino = userResult.rows[0].email;
        if (!emailDestino) {
            return res.json({ success: false, message: "El usuario no tiene un correo asociado" });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        await db.query('UPDATE usuarios SET codigo_recuperacion = $1 WHERE username = $2', [codigo, username]);

        // Petición HTTP directa a la API de Brevo (funciona siempre al instante en Render)
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.EMAIL_PASS, // Usamos tu clave SMTP/API de Brevo
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Booty Gym Sistema", email: process.env.EMAIL_FROM },
                to: [{ email: emailDestino }],
                subject: 'Código de recuperación - Booty Gym',
                textContent: `Hola, tu código de recuperación es: ${codigo}`
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error de Brevo API:", errorData);
            return res.status(500).json({ success: false, message: "Error al enviar el correo" });
        }

        res.json({ success: true, message: "Código enviado con éxito a tu correo." });
    } catch (err) {
        console.error("Error al solicitar código:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});

app.post('/verificar-y-cambiar', async (req, res) => {
    try {
        const { username, codigo, nuevaPass } = req.body;
        
        const result = await db.query(
            'SELECT * FROM usuarios WHERE username = $1 AND codigo_recuperacion = $2',
            [username, codigo]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Código incorrecto' });
        }

        await db.query(
            'UPDATE usuarios SET password_hash = $1, codigo_recuperacion = NULL WHERE username = $2',
            [nuevaPass, username]
        );

        res.status(200).json({ success: true, message: 'Contraseña actualizada' });
    } catch (err) {
        console.error("Error al cambiar contraseña:", err);
        res.status(500).send('Error al cambiar contraseña');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Configuración de Email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cettour53@gmail.com', // CAMBIA ESTO por tu correo real
        pass: 'wcqgjkpmsypvtyju'    // Tu contraseña de aplicación generada
    }
});

// Constante de control
const GIMNASIO_ACTUAL = 'BOOTY_GYM_001';

// Función auxiliar segura para poner la primera letra en mayúscula (solo para nombres y apellidos)
const capitalizar = (str) => {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase());
};

// Función auxiliar para formatear la altura automáticamente para la base de datos (usa punto para SQL)
const formatearAlturaServidor = (val) => {
    if (!val) return null;
    let str = String(val).trim().replace(',', '.'); // Cambiamos cualquier coma por punto para SQL
    // Si escriben en centímetros sin separador (ej: 165 o 170), lo convertimos a metros con punto (1.65 / 1.70)
    if (!str.includes('.') && str.length === 3) {
        return str[0] + '.' + str.slice(1);
    }
    return str;
};

// --- RUTAS DE CLIENTAS ---
app.get('/clientas', async (req, res) => {
    try {
        // Añadido ORDER BY para mostrarlas ordenadas alfabéticamente por nombre y apellido
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
        
        // Aplicamos capitalización y formateo de altura
        const nombreFormateado = capitalizar(nombre);
        const apellidoFormateado = capitalizar(apellido);
        const alturaFormateada = formatearAlturaServidor(altura); 
        
        const diasTexto = Array.isArray(dias) ? dias.join(', ') : (dias || '');

        const query = `INSERT INTO clientas (nombre, apellido, contacto, ubicacion, peso, altura, horario, dias, busto, cintura, cadera, abductores, cuadriceps, gemelos, salud, objetivo, gym_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`;
        
        const values = [
            nombreFormateado, 
            apellidoFormateado, 
            contacto || '', 
            ubicacion || '', 
            peso || null, 
            alturaFormateada || null, 
            horario || '', 
            diasTexto, 
            busto || null, 
            cintura || null, 
            cadera || null, 
            abductores || null, 
            cuadriceps || null, 
            gemelos || null, 
            salud || 'no', 
            objetivo || '', 
            GIMNASIO_ACTUAL
        ];
        
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error al guardar clienta:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- RUTA PARA ACTUALIZAR FICHA DE CLIENTA ---
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

// --- RUTA PARA ELIMINAR CLIENTA ---
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
        const result = await db.query(
            'SELECT * FROM pagos WHERE gym_id = $1 ORDER BY id DESC', 
            [GIMNASIO_ACTUAL]
        );
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

// 1. Obtener la configuración actual al abrir la app
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

// 2. Guardar o actualizar la configuración permanentemente
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
// --- RUTAS DE USUARIO (LOGIN / REGISTER) ---
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
        console.error("Error al registrar usuario:", err);
        res.status(500).send('Error al registrar usuario');
    }
});

app.post('/solicitar-codigo', async (req, res) => {
    try {
        const { username } = req.body;
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        const result = await db.query(
            'UPDATE usuarios SET codigo_recuperacion = $1 WHERE username = $2 RETURNING email',
            [codigo, username]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        const emailDestino = result.rows[0].email;

        await transporter.sendMail({
            from: '"Gym App" <tu_correo@gmail.com>',
            to: emailDestino,
            subject: 'Tu código de recuperación',
            text: `Tu código para restablecer la contraseña es: ${codigo}`
        });
        
        res.status(200).json({ success: true, message: "Código enviado a tu email" });
    } catch (err) {
        console.error("Error al generar código:", err);
        res.status(500).send('Error al procesar la solicitud');
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
        res.status(500).send('Error al cambiar contraseña');
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor activo en http://localhost:${PORT}`));
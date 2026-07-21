const { Pool } = require('pg');

const pool = new Pool({
 connectionString: process.env.DATABASE_URL,
    rejectUnauthorized: false
  }
});

pool.query('SELECT 1', (err, res) => {
  if (err) {
    console.error("❌ ERROR CRÍTICO AL CONECTAR:", err.message);
  } else {
    console.log("✅ CONEXIÓN EXITOSA CON NEON");
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
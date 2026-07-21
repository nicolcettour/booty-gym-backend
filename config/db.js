const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_rz4mjnwtQ6MA@ep-round-forest-auk987v1-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
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
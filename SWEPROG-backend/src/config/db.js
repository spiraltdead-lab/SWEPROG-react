const mysql = require('mysql2/promise');

// Logga värden för att felsöka
console.log('🚀 DB CONFIG:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '*****' : '');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// Testa anslutning direkt när modulen laddas
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Databasanslutning OK');
    connection.release();
  } catch (err) {
    console.error('❌ Kunde inte ansluta till databasen:', err.message);
  }
})();

module.exports = pool;

const pool = require('../config/db');

async function getProjects(userId) {
  const [rows] = await pool.query('SELECT * FROM projects WHERE user_id = ?', [userId]);
  return rows;
}

module.exports = { getProjects };

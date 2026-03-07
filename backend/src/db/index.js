const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.PGHOST     || process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.PGPORT     || process.env.DB_PORT     || '5432'),
  database: process.env.PGDATABASE || process.env.DB_NAME     || 'qos_scheduler',
  user:     process.env.PGUSER     || process.env.DB_USER     || 'kunjpatel',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    throw err;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };

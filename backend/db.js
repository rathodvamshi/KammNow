const env = require('./config/env');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: env.DB_CONNECTION_STRING, // Now strongly typed and guaranteed
  ssl: { rejectUnauthorized: false }
});

const logger = require('./utils/logger');

// Helper for querying
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  const operationMatch = text.match(/^(SELECT|INSERT|UPDATE|DELETE).+?FROM\s+([a-zA-Z0-9_]+)/i) 
    || text.match(/^(INSERT INTO|UPDATE|DELETE FROM)\s+([a-zA-Z0-9_]+)/i);
  const opName = operationMatch ? `${operationMatch[1].trim()} ${operationMatch[2].trim()}` : 'QUERY';

  logger.info(`[DB] ${opName} ${duration}ms rows=${res.rowCount}`);
  return res;
};

module.exports = {
  query,
  pool
};

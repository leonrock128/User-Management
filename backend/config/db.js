const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

const initDatabase = async () => {
  try {
    const connection = await promisePool.getConnection();
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [indexes] = await connection.query(`
      SHOW INDEX FROM users WHERE Key_name = 'idx_uuid'
    `);
    
    
    if (indexes.length === 0) {
      await connection.query(`CREATE INDEX idx_uuid ON users(uuid)`);
    }

    const [nameIndexes] = await connection.query(`
      SHOW INDEX FROM users WHERE Key_name = 'idx_name'
    `);
    
    if (nameIndexes.length === 0) {
      await connection.query(`CREATE INDEX idx_name ON users(name)`);
    }
    
    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

module.exports = { promisePool, initDatabase };
import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,  // Can adjust based on your needs
  queueLimit: 0,
});

// Wrap MySQL query function to return Promises for async/await usage
const _query = (query, values) => {
  return new Promise((resolve, reject) => {
    pool.query(query, values, (err, results) => {
      if (err) {
        reject(err);  // Reject the promise on error
      } else {
        resolve(results);  // Resolve the promise with query results
      }
    });
  });
};

export { _query };

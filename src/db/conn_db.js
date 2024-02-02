const mysql = require('mysql2/promise'); // Importa 'mysql2'

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

if(!db){
    console.error('Error connecting to the database: ' + error);
    throw error;
}

console.log('Database successfully connected.');

module.exports = db;
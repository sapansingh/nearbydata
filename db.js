// db.js
import mysql from "mysql2/promise";

// Create MySQL connection pool
const db = mysql.createPool({
  host: "192.168.200.39",         // your MySQL host
  user: "emri",              // your MySQL username
  password: "emri",              // your MySQL password
  database: "emri", // your database name
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

export default db;

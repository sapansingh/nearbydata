import mysql from "mysql2/promise";

const fallbackDb = mysql.createPool({
  host: "192.168.200.33",
  user: "emri",
  password: "emri",
  database: "emri",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

export default fallbackDb;

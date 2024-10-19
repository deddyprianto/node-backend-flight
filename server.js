const mysql = require("mysql2/promise");

let pool;

async function initializePool() {
  try {
    pool = mysql.createPool(process.env.DATABASE_URL);

    // Test the connection
    const connection = await pool.getConnection();
    console.log("Berhasil terhubung ke MySQL");
    connection.release();
  } catch (error) {
    console.error("Gagal menginisialisasi pool MySQL:", error);
    throw error;
  }
}

initializePool();

// Gunakan pool ini dalam route-route Anda
// Contoh:
// app.get('/api/flights', async (req, res) => {
//   const [rows] = await pool.query('SELECT * FROM flights');
//   res.json(rows);
// });

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Konfigurasi koneksi MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Jika Anda mengatur password, masukkan di sini
  database: 'airline_reservation',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test koneksi
pool.getConnection()
  .then(connection => {
    console.log('Berhasil terhubung ke MySQL');
    connection.release();
  })
  .catch(err => {
    console.error('Gagal terhubung ke MySQL:', err);
  });

// CRUD Operations

// Create (Simpan Pemesanan)
app.post('/api/bookings', async (req, res) => {

  const { flight_id, passenger_data } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [bookingResult] = await connection.query(
        'INSERT INTO BOOKING (flight_id, booking_date, status) VALUES (?, NOW(), ?)',
        [flight_id, 'confirmed']
      );

      const booking_id = bookingResult.insertId;

      for (const passenger of passenger_data) {
        await connection.query(
          'INSERT INTO PASSENGER (booking_id, first_name, last_name, email, phone_number) VALUES (?, ?, ?, ?, ?)',
          [booking_id, passenger.first_name, passenger.last_name, passenger.email, passenger.phone_number]
        );
      }

      await connection.commit();
      connection.release();
      res.status(201).json({ message: 'Pemesanan berhasil dibuat', booking_id });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error saat membuat pemesanan:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat membuat pemesanan' });
  }
});

// Read (Cari Penerbangan)
app.get('/api/flights', async (req, res) => {
  const { origin, destination, date } = req.query;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM FLIGHT WHERE origin = ? AND destination = ? AND DATE(departure_time) = ?',
      [origin, destination, date]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error saat mencari penerbangan:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mencari penerbangan' });
  }
});

// Read (Ambil Detail Pemesanan)
app.get('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [bookingRows] = await pool.query('SELECT * FROM BOOKING WHERE booking_id = ?', [id]);
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });
    }
    const [passengerRows] = await pool.query('SELECT * FROM PASSENGER WHERE booking_id = ?', [id]);
    res.json({ booking: bookingRows[0], passengers: passengerRows });
  } catch (error) {
    console.error('Error saat mengambil detail pemesanan:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil detail pemesanan' });
  }
});

// Update (Ubah Detail Pemesanan)
app.put('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { status, passenger_data } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query('UPDATE BOOKING SET status = ? WHERE booking_id = ?', [status, id]);

      for (const passenger of passenger_data) {
        await connection.query(
          'UPDATE PASSENGER SET first_name = ?, last_name = ?, email = ?, phone_number = ? WHERE passenger_id = ?',
          [passenger.first_name, passenger.last_name, passenger.email, passenger.phone_number, passenger.passenger_id]
        );
      }

      await connection.commit();
      connection.release();
      res.json({ message: 'Pemesanan berhasil diperbarui' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error saat memperbarui pemesanan:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat memperbarui pemesanan' });
  }
});

// Delete (Batalkan Pemesanan)
app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query('DELETE FROM PASSENGER WHERE booking_id = ?', [id]);
      await connection.query('DELETE FROM BOOKING WHERE booking_id = ?', [id]);

      await connection.commit();
      connection.release();
      res.json({ message: 'Pemesanan berhasil dibatalkan' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error saat membatalkan pemesanan:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat membatalkan pemesanan' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
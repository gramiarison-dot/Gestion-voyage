const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = {
    pool,
    async getUserByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },
    async createTrip(data) {
        const { destination, departure_date, return_date, price, available_seats, description } = data;
        const [result] = await pool.query(
            `INSERT INTO trips (destination, departure_date, return_date, price, available_seats, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [destination, departure_date, return_date || null, price, available_seats, description || null]
        );
        return result.insertId;
    },
    async getAllTrips() {
        const [rows] = await pool.query('SELECT * FROM trips ORDER BY departure_date');
        return rows;
    },
    async getTripById(id) {
        const [rows] = await pool.query('SELECT * FROM trips WHERE id = ?', [id]);
        return rows[0];
    },
    async updateTrip(id, data) {
        const { destination, departure_date, return_date, price, available_seats, description } = data;
        const [result] = await pool.query(
            `UPDATE trips SET destination=?, departure_date=?, return_date=?, price=?, available_seats=?, description=? WHERE id=?`,
            [destination, departure_date, return_date || null, price, available_seats, description || null, id]
        );
        return result.affectedRows > 0;
    },
    async deleteTrip(id) {
        const [result] = await pool.query('DELETE FROM trips WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },
    // ... autres fonctions (réservations, stats) si besoin
};
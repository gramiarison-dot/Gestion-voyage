// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'travel_reservation',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Fonctions utilisateurs ---
async function getUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
}

async function createUser(email, hashedPassword, role = 'client') {
    const [result] = await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [email, hashedPassword, role]
    );
    return result.insertId;
}

// --- Fonctions voyages ---
async function getAllTrips() {
    const [rows] = await pool.query('SELECT * FROM trips ORDER BY departure_date');
    return rows;
}

async function getTripById(id) {
    const [rows] = await pool.query('SELECT * FROM trips WHERE id = ?', [id]);
    return rows[0];
}

async function createTrip({ destination, departure_date, return_date, price, available_seats, description }) {
    const [result] = await pool.query(
        `INSERT INTO trips 
        (destination, departure_date, return_date, price, available_seats, description) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [destination, departure_date, return_date || null, price, available_seats, description || null]
    );
    return result.insertId;
}

async function updateTrip(id, { destination, departure_date, return_date, price, available_seats, description }) {
    const [result] = await pool.query(
        `UPDATE trips SET 
        destination = ?, departure_date = ?, return_date = ?, 
        price = ?, available_seats = ?, description = ? 
        WHERE id = ?`,
        [destination, departure_date, return_date || null, price, available_seats, description || null, id]
    );
    return result.affectedRows > 0;
}

async function deleteTrip(id) {
    const [result] = await pool.query('DELETE FROM trips WHERE id = ?', [id]);
    return result.affectedRows > 0;
}

// --- Fonctions réservations ---
async function getAllReservations() {
    const [rows] = await pool.query(
        `SELECT r.*, u.email as user_email, t.destination as trip_destination 
        FROM reservations r 
        JOIN users u ON r.user_id = u.id 
        JOIN trips t ON r.trip_id = t.id 
        ORDER BY r.reservation_date DESC`
    );
    return rows;
}

async function getReservationsByUser(userId) {
    const [rows] = await pool.query(
        `SELECT r.*, t.destination, t.departure_date, t.return_date 
        FROM reservations r 
        JOIN trips t ON r.trip_id = t.id 
        WHERE r.user_id = ? 
        ORDER BY r.reservation_date DESC`,
        [userId]
    );
    return rows;
}

async function createReservation(userId, tripId, seats) {
    const trip = await getTripById(tripId);
    if (!trip || trip.available_seats < seats) {
        throw new Error('Pas assez de places disponibles');
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            'INSERT INTO reservations (user_id, trip_id, seats, status) VALUES (?, ?, ?, ?)',
            [userId, tripId, seats, 'confirmed']
        );
        await connection.query(
            'UPDATE trips SET available_seats = available_seats - ? WHERE id = ?',
            [seats, tripId]
        );
        await connection.commit();
        return result.insertId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function updateReservationStatus(id, status) {
    const [result] = await pool.query(
        'UPDATE reservations SET status = ? WHERE id = ?',
        [status, id]
    );
    return result.affectedRows > 0;
}

async function deleteReservation(id) {
    const [res] = await pool.query('SELECT trip_id, seats FROM reservations WHERE id = ?', [id]);
    if (res.length > 0) {
        const { trip_id, seats } = res[0];
        await pool.query('UPDATE trips SET available_seats = available_seats + ? WHERE id = ?', [seats, trip_id]);
    }
    const [result] = await pool.query('DELETE FROM reservations WHERE id = ?', [id]);
    return result.affectedRows > 0;
}

// --- Statistiques ---
async function getStats() {
    const [totalTrips] = await pool.query('SELECT COUNT(*) as count FROM trips');
    const [totalReservations] = await pool.query('SELECT COUNT(*) as count FROM reservations WHERE status = "confirmed"');
    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "client"');
    return {
        totalTrips: totalTrips[0].count,
        totalReservations: totalReservations[0].count,
        totalUsers: totalUsers[0].count
    };
}

// --- EXPORT ---
module.exports = {
    pool,
    getUserByEmail,
    createUser,
    getAllTrips,
    getTripById,
    createTrip,
    updateTrip,
    deleteTrip,
    getAllReservations,
    getReservationsByUser,
    createReservation,
    updateReservationStatus,
    deleteReservation,
    getStats
};
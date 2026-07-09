const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// ========== AUTHENTICATION ==========
router.post('/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    const userRole = (role === 'admin') ? 'admin' : 'client';
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', 
            [name, email, hashedPassword, userRole]);
        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        res.json({ success: true, user: req.session.user });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

router.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

router.get('/user', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

// ========== TRIPS ==========
router.get('/trips', async (req, res) => {
    try {
        const [trips] = await db.query('SELECT * FROM trips ORDER BY departure_time ASC');
        res.json(trips);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trips' });
    }
});

router.get('/trips/:id', async (req, res) => {
    try {
        const [trips] = await db.query('SELECT * FROM trips WHERE id = ?', [req.params.id]);
        if (trips.length === 0) return res.status(404).json({ error: 'Trip not found' });
        res.json(trips[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trip' });
    }
});

router.get('/trips/:id/seats', async (req, res) => {
    try {
        const tripId = req.params.id;
        const [trip] = await db.query('SELECT total_seats FROM trips WHERE id = ?', [tripId]);
        if (trip.length === 0) return res.status(404).json({ error: 'Trip not found' });
        const [reserved] = await db.query('SELECT seat_number FROM reserved_seats WHERE trip_id = ?', [tripId]);
        const reservedSeats = reserved.map(row => row.seat_number);
        res.json({ totalSeats: trip[0].total_seats, reservedSeats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch seat data' });
    }
});

// ========== RESERVATIONS ==========
router.post('/reservations', isAuthenticated, async (req, res) => {
    const { tripId, seats } = req.body;
    const userId = req.session.user.id;
    if (!seats || seats.length === 0) return res.status(400).json({ error: 'No seats selected' });
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [trips] = await connection.query('SELECT price FROM trips WHERE id = ?', [tripId]);
        if (trips.length === 0) throw new Error('Trip not found');
        const pricePerSeat = parseFloat(trips[0].price);
        const totalPrice = pricePerSeat * seats.length;
        const placeholders = seats.map(() => '?').join(',');
        const [existing] = await connection.query(
            `SELECT seat_number FROM reserved_seats WHERE trip_id = ? AND seat_number IN (${placeholders})`,
            [tripId, ...seats]
        );
        if (existing.length > 0) throw new Error(`Seats already reserved: ${existing.map(s => s.seat_number).join(', ')}`);
        const [reservation] = await connection.query(
            'INSERT INTO reservations (user_id, trip_id, total_price) VALUES (?, ?, ?)',
            [userId, tripId, totalPrice]
        );
        const reservationId = reservation.insertId;
        for (const seatNum of seats) {
            await connection.query(
                'INSERT INTO reserved_seats (reservation_id, trip_id, seat_number) VALUES (?, ?, ?)',
                [reservationId, tripId, seatNum]
            );
        }
        await connection.commit();
        res.json({ success: true, reservationId, totalPrice });
    } catch (err) {
        await connection.rollback();
        res.status(400).json({ error: err.message });
    } finally {
        connection.release();
    }
});

router.get('/reservations', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [reservations] = await db.query(
            `SELECT r.id, r.reservation_date, r.total_price, r.status,
                    t.departure, t.destination, t.departure_time, t.arrival_time,
                    GROUP_CONCAT(rs.seat_number ORDER BY rs.seat_number) as seats
             FROM reservations r
             JOIN trips t ON r.trip_id = t.id
             JOIN reserved_seats rs ON r.id = rs.reservation_id
             WHERE r.user_id = ?
             GROUP BY r.id
             ORDER BY r.reservation_date DESC`,
            [userId]
        );
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
});

router.get('/reservations/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const reservationId = req.params.id;
        const [rows] = await db.query(
            `SELECT r.id, r.reservation_date, r.total_price, r.status,
                    t.departure, t.destination, t.departure_time, t.arrival_time, t.id as trip_id,
                    GROUP_CONCAT(rs.seat_number ORDER BY rs.seat_number) as seats
             FROM reservations r
             JOIN trips t ON r.trip_id = t.id
             JOIN reserved_seats rs ON r.id = rs.reservation_id
             WHERE r.id = ? AND r.user_id = ?
             GROUP BY r.id`,
            [reservationId, userId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reservation' });
    }
});

module.exports = router;
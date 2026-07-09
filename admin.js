const express = require('express');
const db = require('../db');
const { isAuthenticated, isAdmin } = require('../Middleware/auth');

const router = express.Router();

// Apply admin middleware to all routes in this file
router.use(isAuthenticated, isAdmin);

// Dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [totalTrips] = await db.query('SELECT COUNT(*) as count FROM trips');
        const [totalReservations] = await db.query('SELECT COUNT(*) as count FROM reservations');
        const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "client"');
        res.json({
            totalTrips: totalTrips[0].count,
            totalReservations: totalReservations[0].count,
            totalUsers: totalUsers[0].count
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Manage Trips
router.get('/trips', async (req, res) => {
    try {
        const [trips] = await db.query('SELECT * FROM trips ORDER BY departure_time DESC');
        res.json(trips);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trips' });
    }
});

router.post('/trips', async (req, res) => {
    const { departure, destination, departure_time, arrival_time, total_seats, price } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO trips (departure, destination, departure_time, arrival_time, total_seats, price) VALUES (?, ?, ?, ?, ?, ?)',
            [departure, destination, departure_time, arrival_time, total_seats, price]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create trip' });
    }
});

router.put('/trips/:id', async (req, res) => {
    const { departure, destination, departure_time, arrival_time, total_seats, price } = req.body;
    try {
        await db.query(
            'UPDATE trips SET departure=?, destination=?, departure_time=?, arrival_time=?, total_seats=?, price=? WHERE id=?',
            [departure, destination, departure_time, arrival_time, total_seats, price, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update trip' });
    }
});

router.delete('/trips/:id', async (req, res) => {
    try {
        // Check if trip has reservations
        const [reservations] = await db.query('SELECT COUNT(*) as count FROM reservations WHERE trip_id = ?', [req.params.id]);
        if (reservations[0].count > 0) {
            return res.status(400).json({ error: 'Cannot delete trip with existing reservations' });
        }
        await db.query('DELETE FROM trips WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete trip' });
    }
});

// All reservations (admin view)
router.get('/reservations', async (req, res) => {
    try {
        const [reservations] = await db.query(
            `SELECT r.id, r.reservation_date, r.total_price, r.status,
                    u.name as user_name, u.email as user_email,
                    t.departure, t.destination, t.departure_time,
                    GROUP_CONCAT(rs.seat_number ORDER BY rs.seat_number) as seats
             FROM reservations r
             JOIN users u ON r.user_id = u.id
             JOIN trips t ON r.trip_id = t.id
             JOIN reserved_seats rs ON r.id = rs.reservation_id
             GROUP BY r.id
             ORDER BY r.reservation_date DESC`
        );
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
});

module.exports = router;
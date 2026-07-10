const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');  // ← Garder ces noms

// GET /api/trips - liste de tous les voyages
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.pool.query('SELECT * FROM trips ORDER BY departure_time');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/trips/:id - détails d'un voyage
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.pool.query('SELECT * FROM trips WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Voyage non trouvé' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/trips - créer un voyage (admin)
router.post('/', authenticate, isAdmin, async (req, res) => {
    const { 
        departure, 
        destination, 
        departure_time, 
        arrival_time, 
        total_seats, 
        price, 
        description, 
        driver_name, 
        driver_contact 
    } = req.body;

    if (!departure || !destination || !departure_time || !total_seats || price == null) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    try {
        const insertSql = `
            INSERT INTO trips 
            (departure, destination, departure_time, arrival_time, total_seats, price, available_seats, description, driver_name, driver_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.pool.query(insertSql, [
            departure,
            destination,
            departure_time,
            arrival_time || null,
            total_seats,
            price,
            total_seats,
            description || null,
            driver_name || null,
            driver_contact || null
        ]);
        res.status(201).json({ id: result.insertId, message: 'Voyage créé avec succès' });
    } catch (err) {
        console.error('❌ Erreur création voyage :', err);
        res.status(500).json({ error: 'Erreur serveur: ' + err.message });
    }
});

// PUT /api/trips/:id - modifier un voyage (admin)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    const { 
        departure, 
        destination, 
        departure_time, 
        arrival_time, 
        total_seats, 
        price, 
        description, 
        driver_name, 
        driver_contact 
    } = req.body;

    try {
        const updateSql = `
            UPDATE trips
            SET departure = ?, destination = ?, departure_time = ?, arrival_time = ?,
                total_seats = ?, price = ?, available_seats = ?, description = ?,
                driver_name = ?, driver_contact = ?
            WHERE id = ?
        `;
        const [result] = await db.pool.query(updateSql, [
            departure,
            destination,
            departure_time,
            arrival_time || null,
            total_seats,
            price,
            total_seats,
            description || null,
            driver_name || null,
            driver_contact || null,
            req.params.id
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Voyage non trouvé' });
        }
        res.json({ message: 'Voyage mis à jour avec succès' });
    } catch (err) {
        console.error('❌ Erreur PUT /trips/:id:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/trips/:id - supprimer un voyage (admin)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const [reservations] = await db.pool.query(
            'SELECT COUNT(*) as count FROM reservations WHERE trip_id = ?',
            [req.params.id]
        );
        if (reservations[0].count > 0) {
            return res.status(400).json({
                error: 'Impossible de supprimer : des réservations existent pour ce voyage'
            });
        }

        const [result] = await db.pool.query('DELETE FROM trips WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Voyage non trouvé' });
        }
        res.json({ message: 'Voyage supprimé avec succès' });
    } catch (err) {
        console.error('❌ Erreur DELETE /trips/:id:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;

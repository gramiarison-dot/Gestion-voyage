const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

// GET /api/reservations - Liste des réservations
router.get('/', authenticate, async (req, res) => {
    try {
        let sql, params;
        if (req.user.role === 'admin') {
            sql = `
                SELECT r.id, r.user_id, u.name AS user_name, r.trip_id,
                       t.destination, t.departure_date, t.return_date,
                       r.passenger_name, r.passenger_contact, r.passenger_sexe,
                       r.status, r.total_price, r.reservation_date, r.payment_method
                FROM reservations r
                JOIN users u ON r.user_id = u.id
                JOIN trips t ON r.trip_id = t.id
                ORDER BY r.reservation_date DESC
            `;
            params = [];
        } else {
            sql = `
                SELECT r.id, r.trip_id, t.destination, t.departure_date, t.return_date,
                       r.passenger_name, r.passenger_contact, r.passenger_sexe,
                       r.status, r.total_price, r.reservation_date, r.payment_method
                FROM reservations r
                JOIN trips t ON r.trip_id = t.id
                WHERE r.user_id = ?
                ORDER BY r.reservation_date DESC
            `;
            params = [req.user.id];
        }
        const [rows] = await db.pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Erreur chargement réservations:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/reservations - Créer une réservation
router.post('/', authenticate, async (req, res) => {
    const { 
        user_id, 
        trip_id, 
        passenger_name, 
        passenger_contact, 
        passenger_sexe, 
        payment_method,
        status 
    } = req.body;
    
    const finalUserId = user_id || req.user.id;

    // Validation des champs requis
    if (!trip_id) {
        return res.status(400).json({ error: 'ID du voyage est requis' });
    }

    if (!passenger_name || !passenger_contact || !passenger_sexe || !payment_method) {
        return res.status(400).json({ 
            error: 'Nom du passager, contact, sexe et méthode de paiement sont requis' 
        });
    }

    // Valider le sexe
    if (!['M', 'F', 'Homme', 'Femme'].includes(passenger_sexe)) {
        return res.status(400).json({ 
            error: 'Sexe invalide. Utilisez M, F, Homme ou Femme' 
        });
    }

    try {
        // 1. Vérifier que l'utilisateur existe
        const [userRows] = await db.pool.query(
            'SELECT id FROM users WHERE id = ?',
            [finalUserId]
        );
        if (userRows.length === 0) {
            return res.status(400).json({ 
                error: `Utilisateur avec l'ID ${finalUserId} n'existe pas` 
            });
        }

        // 2. Vérifier la disponibilité du voyage
        const [tripRows] = await db.pool.query(
            'SELECT available_seats, price FROM trips WHERE id = ?',
            [trip_id]
        );
        if (tripRows.length === 0) {
            return res.status(404).json({ error: 'Voyage introuvable' });
        }
        
        if (tripRows[0].available_seats < 1) {
            return res.status(400).json({ error: 'Plus de places disponibles pour ce voyage' });
        }

        const price = tripRows[0].price;
        const total_price = price; // 1 place par réservation

        // 3. Créer la réservation
        const [result] = await db.pool.query(
            `INSERT INTO reservations 
             (user_id, trip_id, passenger_name, passenger_contact, 
              passenger_sexe, total_price, status, payment_method) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalUserId, 
                trip_id, 
                passenger_name, 
                passenger_contact, 
                passenger_sexe, 
                total_price, 
                status || 'confirmed',  // Par défaut 'confirmed' selon votre table
                payment_method
            ]
        );

        // 4. Mettre à jour les places disponibles (réduire de 1)
        await db.pool.query(
            'UPDATE trips SET available_seats = available_seats - 1 WHERE id = ?',
            [trip_id]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Réservation créée avec succès'
        });
    } catch (err) {
        console.error('Erreur création réservation:', err);
        res.status(500).json({ error: 'Erreur serveur: ' + err.message });
    }
});

// PUT /api/reservations/:id - Mettre à jour le statut (admin)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    const { status } = req.body;
    
    // Vérifier que le statut est valide selon votre table
    if (!['confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
            error: 'Statut invalide. Utilisez "confirmed" ou "cancelled"' 
        });
    }

    try {
        // Vérifier si la réservation existe
        const [checkReservation] = await db.pool.query(
            'SELECT trip_id FROM reservations WHERE id = ?',
            [req.params.id]
        );
        
        if (checkReservation.length === 0) {
            return res.status(404).json({ error: 'Réservation non trouvée' });
        }

        // Si on annule, remettre les places disponibles
        if (status === 'cancelled') {
            await db.pool.query(
                'UPDATE trips SET available_seats = available_seats + 1 WHERE id = ?',
                [checkReservation[0].trip_id]
            );
        }

        // Mettre à jour le statut
        const [result] = await db.pool.query(
            'UPDATE reservations SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        
        res.json({ 
            message: 'Statut mis à jour avec succès',
            status: status 
        });
    } catch (err) {
        console.error('Erreur mise à jour statut:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/reservations/:id - Supprimer une réservation
router.delete('/:id', authenticate, async (req, res) => {
    try {
        let sql, params;
        
        if (req.user.role === 'admin') {
            // Récupérer le trip_id pour remettre les places
            const [reservation] = await db.pool.query(
                'SELECT trip_id FROM reservations WHERE id = ?', 
                [req.params.id]
            );
            if (reservation.length > 0) {
                await db.pool.query(
                    'UPDATE trips SET available_seats = available_seats + 1 WHERE id = ?', 
                    [reservation[0].trip_id]
                );
            }
            sql = 'DELETE FROM reservations WHERE id = ?';
            params = [req.params.id];
        } else {
            sql = 'DELETE FROM reservations WHERE id = ? AND user_id = ?';
            params = [req.params.id, req.user.id];
        }

        const [result] = await db.pool.query(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Réservation non trouvée ou non autorisée' });
        }
        res.json({ message: 'Réservation supprimée avec succès' });
    } catch (err) {
        console.error('Erreur suppression réservation:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
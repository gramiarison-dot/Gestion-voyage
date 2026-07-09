const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_key_ultra_securisee';

router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Tous les champs sont obligatoires' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Mot de passe trop court' });
    }

    try {
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email déjà utilisé' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await db.createUser(email, hashedPassword, role || 'client');
        
        if (name && userId) {
            await db.pool.query('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
        }

        res.status(201).json({ success: true, message: 'Inscription réussie', userId });
    } catch (err) {
        console.error('❌ Erreur inscription:', err);
        res.status(500).json({ success: false, error: 'Erreur serveur: ' + err.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    try {
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role, name: user.name || '' }
        });
    } catch (err) {
        console.error('❌ Erreur login:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
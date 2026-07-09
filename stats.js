// routes/stats.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Route de statistiques (dashboard)
router.get('/', (req, res) => {
    res.json({ message: 'Statistiques (à implémenter)' });
});

module.exports = router;
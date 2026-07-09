const jwt = require('jsonwebtoken');
const db = require('../config/db'); // ← correction ici
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_key_ultra_securisee';

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Format de token invalide' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        // Vérification supplémentaire : l'utilisateur existe toujours
        const user = await db.getUserByEmail(decoded.email);
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expiré' });
        }
        return res.status(401).json({ error: 'Token invalide' });
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
};

module.exports = { authenticate, isAdmin };
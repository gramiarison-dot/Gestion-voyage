console.log('🚀 Démarrage du serveur...');
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
console.log('✅ Modules chargés');

const app = express();
const PORT = process.env.PORT || 8081;
console.log('✅ PORT défini');

console.log('📦 Tentative de chargement de config/db.js...');
let db;
try {
    db = require('./config/db');
    console.log('✅ config/db.js chargé avec succès');
} catch (err) {
    console.error('❌ Erreur chargement config/db.js :', err.message);
    process.exit(1);
}

// Connexion MySQL
(async () => {
    try {
        await db.pool.query('SELECT 1');
        console.log('✅ Connecté à MySQL');
    } catch (err) {
        console.error('❌ Erreur connexion MySQL :', err.message);
    }
})();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('✅ Middlewares appliqués');

// Fichiers statiques
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/Public', express.static(path.join(__dirname, 'Public')));
app.use(express.static(path.join(__dirname, 'admin')));
console.log('✅ Fichiers statiques servis');

// Routes
console.log('📦 Chargement des routes...');
try {
    const authRoutes = require('./routes/auth');
    const tripRoutes = require('./routes/trips');
    const reservationRoutes = require('./routes/reservations');
    const statsRoutes = require('./routes/stats');
    console.log('✅ Routes importées avec succès');

    app.use('/api/auth', authRoutes);
    app.use('/api/trips', tripRoutes);
    app.use('/api/reservations', reservationRoutes);
    app.use('/api/admin', statsRoutes);
    console.log('✅ Routes montées');
} catch (err) {
    console.error('❌ Erreur lors du chargement des routes :', err.message);
    process.exit(1);
}

// Routes HTML
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'register.html'));
});
app.get('/', (req, res) => {
    res.redirect('/login');
});
console.log('✅ Routes HTML définies');

// Gestion 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});
console.log('✅ Gestion 404 définie');

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
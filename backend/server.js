// ============================================
// CHARGEMENT DES MODULES
// ============================================
console.log('🚀 Démarrage du serveur...');

// 1. Variables d'environnement
require('dotenv').config();
console.log('✅ Dotenv chargé');

// 2. Modules principaux
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
console.log('✅ Modules chargés');

// 3. Configuration du port
const PORT = process.env.PORT || 5000;
console.log(`✅ PORT défini: ${PORT}`);

// 4. Import de la base de données
console.log('📦 Tentative de chargement de config/database.js...');
let db;
try {
  // Essayer différents chemins possibles
  if (require.resolve('./src/config/database.js')) {
    db = require('./src/config/database');
    console.log('✅ Base de données chargée depuis ./src/config/database.js');
  }
} catch (err) {
  console.log('❌ Erreur chargement config/database.js:', err.message);
  
  try {
    db = require('./config/database');
    console.log('✅ Base de données chargée depuis ./config/database.js');
  } catch (err2) {
    console.log('❌ Erreur chargement config/database.js:', err2.message);
    db = null;
  }
}

// 5. Création de l'application Express
const app = express();

// 6. Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 7. Servir les fichiers statiques (frontend)
app.use(express.static(path.join(__dirname, 'public')));
// OU si frontend est à la racine du projet
// app.use(express.static(path.join(__dirname, '../frontend')));

// 8. Routes API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API Gestion Voyage fonctionne!',
    timestamp: new Date().toISOString(),
    dbConnected: db !== null
  });
});

// Routes pour les voyages
app.get('/api/voyages', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' });
    }
    
    const [rows] = await db.promisePool.execute(
      'SELECT * FROM voyages ORDER BY date_depart ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Route par défaut (page d'accueil)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Gestion Voyage API</title>
      <style>
        body { font-family: Arial; padding: 50px; background: #f0f0f0; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; }
        .status { background: #27ae60; color: white; padding: 10px; border-radius: 5px; display: inline-block; }
        .error { background: #e74c3c; color: white; padding: 10px; border-radius: 5px; display: inline-block; }
        ul { list-style: none; padding: 0; }
        li { padding: 10px; border-bottom: 1px solid #eee; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌍 Gestion Voyage API</h1>
        <p>${db ? '<span class="status">✅ Base de données connectée</span>' : '<span class="error">❌ Base de données non connectée</span>'}</p>
        <h2>Endpoints disponibles:</h2>
        <ul>
          <li><code>GET /api/health</code> - Vérification de l'API</li>
          <li><code>GET /api/voyages</code> - Liste des voyages</li>
        </ul>
        <p style="margin-top: 30px; color: #7f8c8d; font-size: 0.9em;">
          📅 ${new Date().toLocaleString()}
        </p>
      </div>
    </body>
    </html>
  `);
});

// 10. Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// 11. Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 12. Démarrer le serveur
app.listen(PORT, () => {
  console.log(`\n🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 API voyages: http://localhost:${PORT}/api/voyages`);
  console.log(`✅ Statut DB: ${db ? 'Connectée' : 'Non connectée'}\n`);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('❌ Erreur non capturée:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Promesse rejetée non traitée:', err);
});
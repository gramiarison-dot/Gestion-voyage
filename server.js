// ============================================
// SERVEUR PRINCIPAL - Gestion Voyage
// ============================================

require('dotenv').config();
console.log('🚀 Démarrage du serveur...');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

console.log('✅ Modules chargés');

// Configuration du port
const PORT = process.env.PORT || 5000;
console.log(`✅ PORT défini: ${PORT}`);

// ============================================
// CHARGEMENT DE LA BASE DE DONNÉES
// ============================================
console.log('📦 Tentative de chargement de la base de données...');

let db = null;
let dbLoaded = false;

// Liste des chemins possibles pour db.js
const possiblePaths = [
  './backend/config/db.js',
  './backend/src/config/db.js',
  './src/config/db.js',
  './config/db.js',
  './backend/db.js',
  './db.js'
];

for (const dbPath of possiblePaths) {
  try {
    console.log(`🔍 Tentative: ${dbPath}`);
    // Vérifier si le fichier existe
    const fs = require('fs');
    if (fs.existsSync(dbPath)) {
      db = require(dbPath);
      console.log(`✅ Base de données chargée depuis ${dbPath}`);
      dbLoaded = true;
      break;
    }
  } catch (error) {
    console.log(`❌ Échec: ${dbPath} - ${error.message}`);
  }
}

if (!dbLoaded) {
  console.warn('⚠️ Aucun fichier db.js trouvé. Base de données non connectée.');
  // Créer un objet db factice pour éviter les erreurs
  db = {
    pool: null,
    promisePool: {
      execute: async () => { throw new Error('Base de données non configurée'); }
    }
  };
}

// ============================================
// CONFIGURATION DE L'APPLICATION
// ============================================
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname, 'Public')));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// ROUTES API
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API Gestion Voyage fonctionne!',
    timestamp: new Date().toISOString(),
    database: dbLoaded ? '✅ Connectée' : '❌ Non connectée',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Liste des voyages
app.get('/api/voyages', async (req, res) => {
  try {
    if (!dbLoaded || !db.promisePool) {
      return res.status(503).json({
        error: 'Service indisponible',
        message: 'Base de données non configurée'
      });
    }
    
    const [rows] = await db.promisePool.execute(
      'SELECT * FROM voyages ORDER BY date_depart ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Erreur /api/voyages:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message 
    });
  }
});

// Voyage par ID
app.get('/api/voyages/:id', async (req, res) => {
  try {
    if (!dbLoaded || !db.promisePool) {
      return res.status(503).json({
        error: 'Service indisponible',
        message: 'Base de données non configurée'
      });
    }
    
    const [rows] = await db.promisePool.execute(
      'SELECT * FROM voyages WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Voyage non trouvé' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('❌ Erreur /api/voyages/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Page d'accueil
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🌍 Gestion Voyage</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body>
      <div class="container mt-5">
        <div class="card shadow">
          <div class="card-body text-center">
            <h1 class="display-4">🌍 Gestion Voyage</h1>
            <p class="lead">API de gestion de voyages</p>
            <div class="mt-4">
              <span class="badge ${dbLoaded ? 'bg-success' : 'bg-danger'} fs-6 p-3">
                ${dbLoaded ? '✅ Base de données connectée' : '❌ Base de données non connectée'}
              </span>
            </div>
            <div class="mt-4">
              <h5>📡 Endpoints disponibles</h5>
              <div class="list-group">
                <a href="/api/health" class="list-group-item list-group-item-action">
                  GET /api/health
                </a>
                <a href="/api/voyages" class="list-group-item list-group-item-action">
                  GET /api/voyages
                </a>
              </div>
            </div>
            <div class="mt-4 text-muted">
              <small>🚀 Déployé sur Render | ${new Date().toLocaleString()}</small>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.path 
  });
});

// Gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║         🌍 Gestion Voyage - Serveur            ║
╠════════════════════════════════════════════════╣
║  🚀 Port: ${PORT}                                ║
║  🌐 URL: http://localhost:${PORT}                ║
║  📊 Health: http://localhost:${PORT}/api/health  ║
║  📋 DB Status: ${dbLoaded ? '✅ Connectée' : '❌ Non connectée'}     ║
╚════════════════════════════════════════════════╝
  `);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('❌ Erreur non capturée:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Promesse rejetée:', err);
});
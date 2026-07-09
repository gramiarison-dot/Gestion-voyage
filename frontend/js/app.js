const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Sessions
app.use(session({
    secret: 'unSecretTresLongPourSignerLesCookies123456',
    resave: false,
    saveUninitialized: false
}));

// Fichiers statiques
app.use('/Public', express.static(path.join(__dirname, 'Public')));

// Démarrage
app.listen(PORT, () => {
    console.log(`Serveur sur http://localhost:${PORT}`);
    console.log(`Testez http://localhost:${PORT}../Public/login.html`);
});
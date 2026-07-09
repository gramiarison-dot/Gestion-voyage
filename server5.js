console.log('🚀 Serveur en cours de démarrage...');

const express = require('express');
const app = express();
const PORT = 8081;

app.get('/', (req, res) => {
    res.send('Hello World! Le serveur fonctionne.');
});

app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
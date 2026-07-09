const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Servir tous les fichiers du dossier "public" à la racine
app.use(express.static(path.join(__dirname, 'Public')));


app.get('/Public/login.html',(req,res)=>{
    res.redirect('/login.html');
});
// Optionnel : route explicite pour /login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.get('/',(req,res)=>{
    res.redirect('/login');
})
app.listen(PORT, () => {
    console.log(`Serveur  démarré sur http://localhost:${PORT}`);
});
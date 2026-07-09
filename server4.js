const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;


//middleware pour lire les données post
app.use(express.urlencoded({extended:true}));
app.use(express.json());

//servir lrd fichier statiques 

app.use(express.static(path.join(__dirname,'Public')));

app.use(express.static(path.join(__dirname,'admin')));

//route post traiter la connexion
app.post('/login',(req,res)=>{
    const{email,password}=req.body;
    //exemple simple:utilisateur
    const adminEmail='admin@gmail.com';
    const adminPassword='admin123';

    if(email===adminEmail&& password===adminPassword){
        res.json({success:true,redirect:'/admin/dashboard.html'});
    }else{
        res.status(401).json({success:false,message:'email ou mot de passe incorrect'});

    }
});

app.get('/login',(req,res)=>{
   res.sendFile(path.join(__dirname,'Public','index.html'));
});

app.get('/',(req,res)=>{
    res.redirect('/login');
});

app.listen(PORT,()=>{
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

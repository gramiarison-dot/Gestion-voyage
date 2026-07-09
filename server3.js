const express=require('express');
const app= express();
const PORT =8080;

app.get('/',(req,res)=>
    res.send('ok'));

app.listen(PORT,'0.0.0.0',()=>{
    console.log(`serveur sur http://localhost:${PORT}`);
});
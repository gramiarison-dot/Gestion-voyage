const voyage=require('..models/Voyage');
const User=require('../models/User');

exports.showIndex=async(req,res)=>{
    const voyages=await voyage.find().limit(3);
    res.render('index',{user:req.session?.user,voyages});
};

exports.showLogin=(req,res)=>{
    res.render('login',{error:null});
};
exports.showDashboard=async(req,res)=>{
    if(!req.session?.user)return res.redirect('/login');
    const reservations=await Reservation.fin({userId:req.session.user.id});
    res.render('dashboard',{user:req.session.user,reservations});
};
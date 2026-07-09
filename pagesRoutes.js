const express=require('express');
const router=express.Router();
const pageController=require('../controllers/pageController');

router.get('/',pageController.showIndex);
router.get('/login',pageController,showLogin);
router.get('/dashboard',pageController.showDashboard);

exports=router;
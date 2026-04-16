'use strict';
const express = require('express');
const { requireSession } = require('../middlewares/auth');
const orgScope = require('../middlewares/orgScope');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// Ana sayfa -> login'e yönlendir
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// Dashboard
router.get('/dashboard', requireSession, orgScope, dashboardController.index);

module.exports = router;

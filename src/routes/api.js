'use strict';
const express = require('express');
const { verifyToken } = require('../middlewares/auth');
const orgController = require('../controllers/orgController');

const router = express.Router();

// ─── Organizasyon API ─────────────────────────────────────────────────────────
router.get('/organizations/tree', verifyToken, orgController.apiTree);
router.get('/organizations',      verifyToken, orgController.index);

// ─── Sağlık ──────────────────────────────────────────────────────────────────
router.get('/ping', (req, res) => res.json({ success: true, message: 'pong', ts: Date.now() }));

module.exports = router;

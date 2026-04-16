'use strict';
const express = require('express');
const { requireSession, requireAdmin } = require('../middlewares/auth');
const orgController = require('../controllers/orgController');

const router = express.Router();

// Tüm admin rotaları için session + admin rolü zorunlu
router.use(requireSession, requireAdmin);

// ─── Organizasyon Yönetimi ────────────────────────────────────────────────────
router.get('/organizations',          orgController.index);
router.get('/organizations/tree',     orgController.tree);
router.get('/organizations/create',   orgController.create);
router.post('/organizations',         orgController.store);
router.get('/organizations/:id/edit', orgController.edit);
router.post('/organizations/:id',     orgController.update);
router.patch('/organizations/:id/toggle', orgController.toggleStatus);

// ─── Kullanıcı Yönetimi (Faz 1'de genişleyecek) ──────────────────────────────
router.get('/users', (req, res) => res.render('admin/users/index', { title: 'Kullanıcılar' }));

module.exports = router;

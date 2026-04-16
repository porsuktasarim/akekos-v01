'use strict';
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const router = express.Router();

// Login deneme limiti
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_ATTEMPT_LIMIT) || 5,
  skipSuccessfulRequests: true,
  message: 'Çok fazla başarısız giriş denemesi. 15 dakika sonra tekrar deneyin.'
});

// Doğrulama kuralları
const loginValidation = [
  body('email').isEmail().withMessage('Geçerli bir e-posta girin.').normalizeEmail(),
  body('password').notEmpty().withMessage('Şifre gerekli.')
];

// Rotalar
router.get('/login', authController.showLogin);
router.post('/login', loginLimiter, loginValidation, authController.login);
router.get('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.showResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;

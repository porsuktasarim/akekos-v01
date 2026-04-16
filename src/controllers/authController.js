'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../config/logger');

const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 15 * 60 * 1000
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/auth/refresh'
  });
};

exports.showLogin = (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Giriş Yap', error: null });
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/login', { title: 'Giriş Yap', error: errors.array()[0].msg });
    }

    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
    
    if (!user || !user.isActive) {
      return res.render('auth/login', { title: 'Giriş Yap', error: 'E-posta veya şifre hatalı.' });
    }
    
    if (user.isLocked) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.render('auth/login', {
        title: 'Giriş Yap',
        error: `Hesabınız kilitlendi. ${minutesLeft} dakika sonra tekrar deneyin.`
      });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      const LIMIT = parseInt(process.env.LOGIN_ATTEMPT_LIMIT) || 5;
      const remaining = LIMIT - (user.loginAttempts + 1);
      const msg = remaining > 0
        ? `Hatalı şifre. ${remaining} deneme hakkınız kaldı.`
        : 'Hesabınız kilitlendi.';
      return res.render('auth/login', { title: 'Giriş Yap', error: msg });
    }
    
    await user.resetLoginAttempts();
    
    // Session oluştur
    req.session.user = {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      avatar: user.avatar
    };
    
    // JWT tokenlar
    const accessToken  = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    
    // Refresh token'ı DB'ye kaydet
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: { token: refreshToken, expiresAt, ip: req.ip, userAgent: req.headers['user-agent'] } },
      lastLoginAt: new Date(),
      lastLoginIp: req.ip
    });
    
    setTokenCookies(res, accessToken, refreshToken);
    
    logger.info(`Başarılı giriş: ${user.email} (${user.role})`);
    
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  const userId = req.session.user?._id;
  
  // Refresh token'ı temizle
  if (userId) {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: { token: refreshToken } }
      });
    }
  }
  
  req.session.destroy();
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.redirect('/auth/login');
};

exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token bulunamadı.' });
    
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Geçersiz token.' });
    }
    
    const storedToken = user.refreshTokens.find(t => t.token === token && t.expiresAt > new Date());
    if (!storedToken) {
      return res.status(401).json({ success: false, message: 'Token geçersiz veya süresi doldu.' });
    }
    
    const newAccessToken  = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);
    
    // Eski token'ı kaldır, yenisini ekle
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: { token } },
      $push: { refreshTokens: { token: newRefreshToken, expiresAt, ip: req.ip } }
    });
    
    setTokenCookies(res, newAccessToken, newRefreshToken);
    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Geçersiz token.' });
    }
    next(err);
  }
};

exports.showForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { title: 'Şifremi Unuttum', message: null, error: null });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Güvenlik: Kullanıcı yoksa da aynı mesajı göster
    if (!user) {
      return res.render('auth/forgot-password', {
        title: 'Şifremi Unuttum',
        message: 'E-posta adresinize sıfırlama bağlantısı gönderildi.',
        error: null
      });
    }
    
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    // TODO: E-posta gönderme servisi entegrasyonu
    const resetUrl = `${process.env.APP_URL}/auth/reset-password/${resetToken}`;
    logger.info(`Şifre sıfırlama bağlantısı: ${resetUrl} (Kullanıcı: ${user.email})`);
    
    res.render('auth/forgot-password', {
      title: 'Şifremi Unuttum',
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
      error: null
    });
  } catch (err) {
    next(err);
  }
};

exports.showResetPassword = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    return res.render('auth/reset-password', {
      title: 'Şifre Sıfırla', token: null,
      error: 'Geçersiz veya süresi dolmuş bağlantı.'
    });
  }
  
  res.render('auth/reset-password', { title: 'Şifre Sıfırla', token: req.params.token, error: null });
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.render('auth/reset-password', {
        title: 'Şifre Sıfırla', token: null,
        error: 'Geçersiz veya süresi dolmuş bağlantı.'
      });
    }
    
    if (req.body.password !== req.body.confirmPassword) {
      return res.render('auth/reset-password', {
        title: 'Şifre Sıfırla', token: req.params.token,
        error: 'Şifreler eşleşmiyor.'
      });
    }
    
    user.password = req.body.password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    logger.info(`Şifre sıfırlandı: ${user.email}`);
    req.flash('success', 'Şifreniz başarıyla güncellendi. Lütfen giriş yapın.');
    res.redirect('/auth/login');
  } catch (err) {
    next(err);
  }
};

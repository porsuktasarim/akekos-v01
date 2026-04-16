'use strict';
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Sunucu hatası oluştu.';

  // Mongoose doğrulama hatası
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    message = errors.join(', ');
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Bu ${field} zaten kullanılıyor.`;
  }
  
  // Mongoose geçersiz ID
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Geçersiz ID formatı.';
  }
  
  // JWT hataları
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Geçersiz token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token süresi doldu.';
  }

  // Log
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${req.method} ${req.path} - ${message}`, { stack: err.stack });
  } else {
    logger.warn(`[${statusCode}] ${req.method} ${req.path} - ${message}`);
  }

  // API yanıtı
  if (req.xhr || req.path.startsWith('/api') || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
  // Web yanıtı
  const view = statusCode === 404 ? 'errors/404' : 'errors/500';
  return res.status(statusCode).render(view, { title: `Hata ${statusCode}`, message });
};

module.exports = errorHandler;

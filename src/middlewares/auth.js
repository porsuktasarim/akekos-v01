'use strict';
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * JWT token doğrulama (API rotaları için)
 */
const verifyToken = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Kimlik doğrulama gerekli.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('organizationId', 'name slug path level type');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Geçersiz veya pasif hesap.' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token süresi doldu.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Geçersiz token.' });
  }
};

/**
 * Session doğrulama (Web rotaları için)
 */
const requireSession = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Bu sayfaya erişmek için giriş yapmalısınız.');
  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
};

/**
 * Rol kontrolü
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    const user = req.user || req.session.user;
    if (!user) {
      if (req.xhr || req.path.startsWith('/api')) {
        return res.status(401).json({ success: false, message: 'Kimlik doğrulama gerekli.' });
      }
      return res.redirect('/auth/login');
    }
    
    if (!roles.includes(user.role)) {
      logger.warn(`Yetkisiz erişim girişimi: ${user.email} -> ${req.path}`);
      if (req.xhr || req.path.startsWith('/api')) {
        return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz bulunmuyor.' });
      }
      return res.status(403).render('errors/403', { title: 'Yetkisiz Erişim' });
    }
    next();
  };
};

/**
 * İzin kontrolü (kaynak bazlı)
 */
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    const user = req.user || req.session.user;
    if (!user) return res.status(401).json({ success: false, message: 'Kimlik doğrulama gerekli.' });
    
    const permissions = require('../config/permissions');
    const rolePerms   = permissions[user.role] || {};
    const allPerms    = rolePerms['*'];
    const resPerm     = rolePerms[resource] || [];
    
    const hasAccess = (allPerms && (allPerms.includes('*') || allPerms.includes(action))) ||
                      resPerm.includes('*') || resPerm.includes(action);
    
    if (!hasAccess) {
      if (req.xhr || req.path.startsWith('/api')) {
        return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz bulunmuyor.' });
      }
      return res.status(403).render('errors/403', { title: 'Yetkisiz Erişim' });
    }
    next();
  };
};

/**
 * Sadece admin
 */
const requireAdmin = requireRole('admin');

module.exports = { verifyToken, requireSession, requireRole, requirePermission, requireAdmin };

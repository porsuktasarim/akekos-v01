'use strict';
/**
 * Organizasyon Kapsam Middleware
 * 
 * Her request'e otomatik olarak kullanıcının organizasyon kapsamını ekler.
 * Admin kullanıcılar tüm organizasyonlara erişebilir.
 * Diğer kullanıcılar sadece kendi organizasyonları ve alt organizasyonlarına erişebilir.
 * 
 * Kullanım:
 *   router.get('/items', requireSession, orgScope, controller.list)
 *   // req.orgFilter => MongoDB sorgu filtresi
 *   // req.orgIds    => Erişilebilir organizasyon ID listesi
 */
const Organization = require('../models/Organization');
const logger = require('../config/logger');

const orgScope = async (req, res, next) => {
  try {
    const user = req.user || req.session.user;
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Kimlik doğrulama gerekli.' });
    }
    
    // Admin: tüm organizasyonlara erişim
    if (user.role === 'admin') {
      req.orgFilter = {};
      req.orgIds    = null; // null => filtre yok
      req.isAdmin   = true;
      return next();
    }
    
    // Diğer roller: kendi org + alt org'lar
    if (!user.organizationId) {
      req.orgFilter = { _id: null }; // Hiçbir şeye erişim yok
      req.orgIds    = [];
      return next();
    }
    
    const orgId   = user.organizationId._id || user.organizationId;
    const org     = await Organization.findById(orgId).lean();
    
    if (!org) {
      req.orgFilter = { _id: null };
      req.orgIds    = [];
      return next();
    }
    
    // Kendi org + tüm alt org'lar
    const descendants = await Organization.find({
      path: new RegExp(`,${orgId},`),
      isActive: true
    }).select('_id').lean();
    
    const orgIds = [orgId, ...descendants.map(d => d._id)];
    
    req.orgFilter     = { organizationId: { $in: orgIds } };
    req.orgIds        = orgIds;
    req.currentOrg    = org;
    req.isAdmin       = false;
    
    // View'lar için
    if (res.locals) {
      res.locals.currentOrg = org;
      res.locals.orgIds     = orgIds;
    }
    
    next();
  } catch (err) {
    logger.error('orgScope middleware hatası:', err);
    next(err);
  }
};

module.exports = orgScope;

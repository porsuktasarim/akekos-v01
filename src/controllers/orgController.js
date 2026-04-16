'use strict';
const Organization = require('../models/Organization');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Organizasyon ağacı görüntüleme (Admin paneli)
 */
exports.tree = async (req, res, next) => {
  try {
    const orgs = await Organization.find({}).sort({ level: 1, name: 1 }).lean();
    res.render('admin/org/tree', { title: 'Organizasyon Ağacı', orgs });
  } catch (err) { next(err); }
};

/**
 * Tüm organizasyonlar listesi
 */
exports.index = async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search, type, isActive, parentId } = req.query;
    const filter = {};
    
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (type)   filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (parentId) filter.parentId = parentId;
    
    const total = await Organization.countDocuments(filter);
    const orgs  = await Organization.find(filter)
      .populate('parentId', 'name slug')
      .sort({ level: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const parents = await Organization.find({ isActive: true }).select('name slug level type').sort({ level: 1, name: 1 }).lean();
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, data: orgs, total, page: parseInt(page), limit: parseInt(limit) });
    }
    
    res.render('admin/org/index', {
      title: 'Organizasyonlar', orgs, total, page: parseInt(page),
      limit: parseInt(limit), parents, query: req.query
    });
  } catch (err) { next(err); }
};

/**
 * Yeni organizasyon formu
 */
exports.create = async (req, res, next) => {
  try {
    const parents = await Organization.find({ isActive: true }).select('name slug level type').sort({ level: 1, name: 1 }).lean();
    res.render('admin/org/form', { title: 'Organizasyon Ekle', org: null, parents, errors: [] });
  } catch (err) { next(err); }
};

/**
 * Organizasyon kaydet
 */
exports.store = async (req, res, next) => {
  try {
    const { name, description, type, parentId, address, phone, email, isActive } = req.body;
    
    const org = new Organization({
      name, description, type,
      parentId: parentId || null,
      address, phone, email,
      isActive: isActive === 'on' || isActive === 'true',
      createdBy: req.session.user._id
    });
    
    await org.save();
    logger.info(`Organizasyon oluşturuldu: ${org.name} (ID: ${org._id})`);
    req.flash('success', `"${org.name}" organizasyonu oluşturuldu.`);
    res.redirect('/admin/organizations');
  } catch (err) {
    if (err.name === 'ValidationError') {
      const parents = await Organization.find({ isActive: true }).select('name slug level type').sort({ level: 1, name: 1 }).lean();
      return res.render('admin/org/form', {
        title: 'Organizasyon Ekle',
        org: req.body, parents,
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    next(err);
  }
};

/**
 * Organizasyon düzenleme formu
 */
exports.edit = async (req, res, next) => {
  try {
    const org     = await Organization.findById(req.params.id).lean();
    if (!org) return res.status(404).render('errors/404', { title: 'Bulunamadı' });
    const parents = await Organization.find({ isActive: true, _id: { $ne: req.params.id } })
      .select('name slug level type').sort({ level: 1, name: 1 }).lean();
    res.render('admin/org/form', { title: 'Organizasyonu Düzenle', org, parents, errors: [] });
  } catch (err) { next(err); }
};

/**
 * Organizasyon güncelle
 */
exports.update = async (req, res, next) => {
  try {
    const { name, description, type, parentId, address, phone, email, isActive } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).render('errors/404', { title: 'Bulunamadı' });
    
    org.name        = name;
    org.description = description;
    org.type        = type;
    org.parentId    = parentId || null;
    org.address     = address;
    org.phone       = phone;
    org.email       = email;
    org.isActive    = isActive === 'on' || isActive === 'true';
    
    await org.save();
    logger.info(`Organizasyon güncellendi: ${org.name} (ID: ${org._id})`);
    req.flash('success', `"${org.name}" organizasyonu güncellendi.`);
    res.redirect('/admin/organizations');
  } catch (err) { next(err); }
};

/**
 * Aktif/Pasif durumu değiştir
 */
exports.toggleStatus = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Bulunamadı.' });
    
    org.isActive = !org.isActive;
    await org.save();
    
    res.json({ success: true, isActive: org.isActive, message: `Organizasyon ${org.isActive ? 'aktif' : 'pasif'} yapıldı.` });
  } catch (err) { next(err); }
};

/**
 * API: Organizasyon ağacı (JSON)
 */
exports.apiTree = async (req, res, next) => {
  try {
    const orgs = await Organization.find({ isActive: true }).sort({ level: 1, name: 1 }).lean();
    
    // Ağaç yapısına dönüştür
    const buildTree = (items, parentId = null) => {
      return items
        .filter(i => String(i.parentId || null) === String(parentId))
        .map(item => ({ ...item, children: buildTree(items, item._id) }));
    };
    
    res.json({ success: true, data: buildTree(orgs) });
  } catch (err) { next(err); }
};

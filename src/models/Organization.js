'use strict';
/**
 * Organization Model
 * 
 * Materialized Path pattern ile hiyerarşik organizasyon yapısı.
 * 
 * Örnek:
 *   Merkez           path: ","
 *   ├─ Ankara        path: ",merkez_id,"
 *   │  ├─ Kent AK    path: ",merkez_id,ankara_id,"
 *   │  └─ Orman      path: ",merkez_id,ankara_id,"
 *   └─ İstanbul      path: ",merkez_id,"
 */
const mongoose = require('mongoose');
const slugify = require('slugify');

const ORG_TYPES = ['merkez', 'bolge', 'il', 'ilce', 'birim'];

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organizasyon adı zorunludur.'],
    trim: true,
    maxlength: [120, 'Organizasyon adı 120 karakteri aşamaz.']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true
  },
  description: { type: String, trim: true, maxlength: 500 },
  
  // Hiyerarşi
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true
  },
  path: {
    type: String,
    default: ',',
    index: true
  },
  level: {
    type: Number,
    default: 0,
    index: true
  },
  type: {
    type: String,
    enum: ORG_TYPES,
    default: 'birim'
  },
  
  // İletişim
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  
  // Durum
  isActive: { type: Boolean, default: true, index: true },
  
  // Meta
  logo: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── Slug üretimi ─────────────────────────────────────────────────────────────
organizationSchema.pre('save', async function(next) {
  if (!this.isModified('name') && this.slug) return next();
  
  let baseSlug = slugify(this.name, { lower: true, strict: true, locale: 'tr' });
  let slug = baseSlug;
  let counter = 0;
  
  while (true) {
    const exists = await mongoose.model('Organization').findOne({ slug, _id: { $ne: this._id } });
    if (!exists) break;
    slug = `${baseSlug}-${++counter}`;
  }
  this.slug = slug;
  next();
});

// ─── Path güncelleme ──────────────────────────────────────────────────────────
organizationSchema.pre('save', async function(next) {
  if (!this.isModified('parentId')) return next();
  
  if (!this.parentId) {
    this.path = ',';
    this.level = 0;
  } else {
    const parent = await mongoose.model('Organization').findById(this.parentId);
    if (!parent) return next(new Error('Üst organizasyon bulunamadı.'));
    this.path = `${parent.path}${parent._id},`;
    this.level = parent.level + 1;
  }
  next();
});

// ─── Virtual: Çocuk sayısı ────────────────────────────────────────────────────
organizationSchema.virtual('childrenCount', {
  ref: 'Organization',
  localField: '_id',
  foreignField: 'parentId',
  count: true
});

// ─── Statik metotlar ──────────────────────────────────────────────────────────
organizationSchema.statics.getTree = async function(rootId = null) {
  const query = rootId ? { path: new RegExp(`,${rootId},`) } : {};
  return this.find(query).sort({ level: 1, name: 1 }).lean();
};

organizationSchema.statics.getDescendants = async function(orgId) {
  return this.find({ path: new RegExp(`,${orgId},`) }).lean();
};

organizationSchema.statics.getAncestors = async function(path) {
  const ids = path.split(',').filter(Boolean);
  return this.find({ _id: { $in: ids } }).sort({ level: 1 }).lean();
};

const Organization = mongoose.model('Organization', organizationSchema);
module.exports = Organization;

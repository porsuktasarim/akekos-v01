'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ROLES = ['admin', 'koordinator', 'takim_lideri', 'personel', 'gonullu', 'gozlemci'];

const userSchema = new mongoose.Schema({
  // Kimlik
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName:  { type: String, required: true, trim: true, maxlength: 50 },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone:     { type: String, trim: true },
  
  // Şifre
  password:  { type: String, required: true, minlength: 8, select: false },
  
  // Rol & Yetki
  role: { type: String, enum: ROLES, default: 'personel', index: true },
  
  // Organizasyon ataması
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  
  // Oturum güvenliği
  loginAttempts:  { type: Number, default: 0 },
  lockUntil:      { type: Date },
  lastLoginAt:    { type: Date },
  lastLoginIp:    { type: String },
  
  // Şifre sıfırlama
  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date,   select: false },
  
  // Token yönetimi
  refreshTokens: [{
    token:     { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    ip:        { type: String },
    userAgent: { type: String }
  }],
  
  // Profil
  avatar:    { type: String },
  bio:       { type: String, maxlength: 500 },
  
  // Durum
  isActive:  { type: Boolean, default: true, index: true },
  isVerified:{ type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── Virtual ─────────────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─── Şifre hash ──────────────────────────────────────────────────────────────
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// ─── Metotlar ─────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incLoginAttempts = async function() {
  const LIMIT    = parseInt(process.env.LOGIN_ATTEMPT_LIMIT) || 5;
  const LOCKTIME = parseInt(process.env.LOGIN_LOCKOUT_TIME)  || 15 * 60 * 1000;
  
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $unset: { lockUntil: 1 }, $set: { loginAttempts: 1 } });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= LIMIT && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCKTIME) };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({ $unset: { loginAttempts: 1, lockUntil: 1 } });
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken   = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat
  return resetToken;
};

userSchema.methods.canAccess = function(resource, action) {
  const permissions = require('../config/permissions');
  const rolePerms = permissions[this.role] || {};
  const resourcePerms = rolePerms[resource] || [];
  return resourcePerms.includes(action) || resourcePerms.includes('*');
};

const User = mongoose.model('User', userSchema);
module.exports = User;

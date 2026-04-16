'use strict';
require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/database');
const Organization = require('../models/Organization');
const User = require('../models/User');
const logger = require('../config/logger');

async function seed() {
  await connectDB();
  logger.info('Seed başlıyor...');

  // Organizasyonları temizle ve yeniden oluştur
  await Organization.deleteMany({});
  await User.deleteMany({});

  // ─── Organizasyon Ağacı ──────────────────────────────────────────────────
  const merkez = await Organization.create({
    name: 'AKEKOS Merkez',
    type: 'merkez',
    parentId: null,
    isActive: true,
    description: 'Arama Kurtarma Ekipman Kontrol ve Operasyon Sistemi Merkez Teşkilatı'
  });
  
  const ankara = await Organization.create({ name: 'Ankara Ekibi', type: 'il', parentId: merkez._id, isActive: true });
  const istanbul = await Organization.create({ name: 'İstanbul Ekibi', type: 'il', parentId: merkez._id, isActive: true });
  const izmir = await Organization.create({ name: 'İzmir Ekibi', type: 'il', parentId: merkez._id, isActive: true });
  
  await Organization.create({ name: 'İstanbul Kent Arama Kurtarma', type: 'birim', parentId: istanbul._id, isActive: true });
  await Organization.create({ name: 'İstanbul Orman Yangını', type: 'birim', parentId: istanbul._id, isActive: true });
  await Organization.create({ name: 'İstanbul Doğa Arama Kurtarma', type: 'birim', parentId: istanbul._id, isActive: true });
  await Organization.create({ name: 'Ankara Kent Arama Kurtarma', type: 'birim', parentId: ankara._id, isActive: true });
  await Organization.create({ name: 'Ankara Doğa Arama Kurtarma', type: 'birim', parentId: ankara._id, isActive: true });
  await Organization.create({ name: 'İzmir Kıyı Kurtarma', type: 'birim', parentId: izmir._id, isActive: true });

  logger.info('Organizasyonlar oluşturuldu.');

  // ─── Admin Kullanıcısı ───────────────────────────────────────────────────
  const adminUser = await User.create({
    firstName: 'Sistem',
    lastName: 'Yöneticisi',
    email: 'admin@akekos.local',
    password: 'Admin@2024!',
    role: 'admin',
    organizationId: merkez._id,
    isActive: true,
    isVerified: true
  });

  logger.info(`Admin kullanıcısı: ${adminUser.email} / Admin@2024!`);
  logger.info('Seed tamamlandı!');
  
  await disconnectDB();
  process.exit(0);
}

seed().catch(err => {
  logger.error('Seed hatası:', err);
  process.exit(1);
});

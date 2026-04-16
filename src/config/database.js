'use strict';
const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/akekos';
  
  mongoose.set('strictQuery', true);
  
  const opts = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  };

  try {
    await mongoose.connect(uri, opts);
  } catch (err) {
    logger.error('MongoDB bağlantı hatası:', err.message);
    throw err;
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB bağlantısı kesildi. Yeniden bağlanılıyor...');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB hatası:', err);
  });
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  logger.info('MongoDB bağlantısı kapatıldı.');
};

module.exports = { connectDB, disconnectDB, mongoose };

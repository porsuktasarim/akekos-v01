'use strict';
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    logger.info('MongoDB bağlantısı kuruldu.');

    app.listen(PORT, () => {
      logger.info(`AKEKOS sunucusu ${PORT} portunda çalışıyor. [Ortam: ${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Sunucu başlatma hatası:', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  logger.error('İşlenmeyen Promise Hatası:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Yakalanmamış İstisna:', err);
  process.exit(1);
});

startServer();

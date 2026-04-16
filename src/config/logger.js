'use strict';
const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const levels = {
  error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
};

const colors = {
  error: 'red', warn: 'yellow', info: 'green',
  http: 'magenta', verbose: 'cyan', debug: 'blue', silly: 'grey'
};
winston.addColors(colors);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', format: fileFormat }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'), format: fileFormat })
  ]
});

module.exports = logger;

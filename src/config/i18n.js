'use strict';
/**
 * AKEKOS - Uluslararasılaştırma (i18n) Motoru
 * 
 * Dil dosyaları locales/ klasöründe .json formatında tutulur.
 * Gelecekte .po formatına geçiş için altyapı hazır.
 * 
 * Kullanım:
 *   const i18n = require('./i18n');
 *   i18n.t('auth.login.title')          // => "Giriş Yap"
 *   i18n.t('general.hello', { name })   // => "Merhaba, Ahmet"
 *   i18n.setLang('en')                  // Dil değiştir
 */
const fs = require('fs');
const path = require('path');

class I18n {
  constructor() {
    this._lang = process.env.APP_LANG || 'tr';
    this._fallback = 'tr';
    this._cache = {};
    this._localesDir = path.join(__dirname, '../../locales');
    this._load(this._lang);
    this._load(this._fallback);
  }

  _load(lang) {
    if (this._cache[lang]) return;
    const filePath = path.join(this._localesDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      this._cache[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      this._cache[lang] = {};
    }
  }

  setLang(lang) {
    this._lang = lang;
    this._load(lang);
  }

  getLang() {
    return this._lang;
  }

  /**
   * Çeviri getir
   * @param {string} key - Noktalı yol: 'auth.login.title'
   * @param {object} [params] - Yerleşim değerleri: { name: 'Ahmet' }
   */
  t(key, params = {}) {
    const value = this._resolve(key, this._lang) 
      || this._resolve(key, this._fallback) 
      || key;
    return this._interpolate(value, params);
  }

  _resolve(key, lang) {
    const parts = key.split('.');
    let obj = this._cache[lang] || {};
    for (const part of parts) {
      if (obj === undefined || obj === null) return undefined;
      obj = obj[part];
    }
    return typeof obj === 'string' ? obj : undefined;
  }

  _interpolate(str, params) {
    return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => params[k] !== undefined ? params[k] : `{{${k}}}`);
  }
}

module.exports = new I18n();

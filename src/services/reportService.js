'use strict';
/**
 * AKEKOS Raporlama Servisi
 * 
 * Modüler yapı: Her modül bu servisi kendi ihtiyacına göre kullanır.
 * 
 * Kullanım:
 *   const ReportService = require('../services/reportService');
 *   const excelBuffer = await ReportService.toExcel(data, options);
 *   res.setHeader('Content-Disposition', 'attachment; filename=rapor.xlsx');
 *   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 *   res.send(excelBuffer);
 */
const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

class ReportService {
  /**
   * Excel (XLSX) oluştur
   * @param {Array} data - Veri dizisi (nesne dizisi)
   * @param {object} options
   * @param {string} options.title - Sayfa başlığı
   * @param {Array} options.columns - [{ key, header, width }]
   * @param {string} options.sheetName - Sayfa adı
   * @returns {Buffer}
   */
  static toExcel(data, options = {}) {
    const { title = 'Rapor', columns = [], sheetName = 'Sayfa1', metadata = {} } = options;
    
    const wb = XLSX.utils.book_new();
    
    // Başlık satırları
    const headerRows = [
      ['AKEKOS - ' + title],
      [`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`],
      []
    ];
    
    // Sütun başlıkları
    if (columns.length > 0) {
      headerRows.push(columns.map(c => c.header));
    }
    
    // Veri satırları
    const dataRows = data.map(row => {
      if (columns.length > 0) {
        return columns.map(c => {
          const val = c.key.split('.').reduce((o, k) => o?.[k], row);
          return c.format ? c.format(val, row) : (val ?? '');
        });
      }
      return Object.values(row);
    });
    
    const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);
    
    // Sütun genişlikleri
    if (columns.length > 0) {
      ws['!cols'] = columns.map(c => ({ wch: c.width || 20 }));
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * CSV oluştur
   */
  static toCsv(data, options = {}) {
    const { columns = [] } = options;
    
    const rows = [];
    if (columns.length > 0) {
      rows.push(columns.map(c => c.header).join(','));
    }
    
    data.forEach(row => {
      let line;
      if (columns.length > 0) {
        line = columns.map(c => {
          const val = c.key.split('.').reduce((o, k) => o?.[k], row);
          const str = String(c.format ? c.format(val, row) : (val ?? '')).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',');
      } else {
        line = Object.values(row).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
      }
      rows.push(line);
    });
    
    return '\uFEFF' + rows.join('\n'); // BOM for Turkish chars
  }

  /**
   * Express response helper
   */
  static sendExcel(res, buffer, filename = 'rapor') {
    const name = `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(buffer);
  }

  static sendCsv(res, csvString, filename = 'rapor') {
    const name = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(csvString);
  }
}

module.exports = ReportService;

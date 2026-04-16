/**
 * AKEKOS - Ana JavaScript
 * 
 * Modüler yapı: Her özellik kendi namespace'i altında.
 * Kullanım: AKEKOS.toast('Mesaj', 'success')
 *           AKEKOS.report.enable(tableId, options)
 *           AKEKOS.table.init(selector, options)
 */
const AKEKOS = (function() {
  'use strict';

  // ── Toast Sistemi ──────────────────────────────────────────────────────────
  const toast = function(message, type = 'success', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const iconMap = { success: 'check-circle-fill', danger: 'exclamation-triangle-fill',
      warning: 'exclamation-circle-fill', info: 'info-circle-fill' };
    const id = 'toast-' + Date.now();

    const el = document.createElement('div');
    el.id = id;
    el.className = `toast align-items-center text-bg-${type} border-0 shadow`;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi bi-${iconMap[type] || 'bell-fill'}"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;

    container.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: duration });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  };

  // ── Sidebar Toggle ─────────────────────────────────────────────────────────
  const initSidebar = function() {
    const btn     = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (!btn || !sidebar) return;

    // Durumu localStorage'dan al
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (collapsed) sidebar.classList.add('collapsed');

    btn.addEventListener('click', function() {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        sidebar.classList.toggle('mobile-open');
        let overlay = document.getElementById('sidebar-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'sidebar-overlay';
          document.body.appendChild(overlay);
          overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.remove();
          });
        } else {
          overlay.remove();
        }
      } else {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      }
    });
  };

  // ── DataTable Wrapper ──────────────────────────────────────────────────────
  const table = {
    /**
     * DataTable başlat
     * @param {string} selector - CSS seçici (#tableId)
     * @param {object} options  - DataTables opsiyonları
     * @param {object} reportOptions - Raporlama opsiyonları
     */
    init: function(selector, options = {}, reportOptions = null) {
      const el = document.querySelector(selector);
      if (!el || !$.fn.DataTable) return null;

      const defaults = {
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.8/i18n/tr.json' },
        pageLength: 25,
        responsive: true,
        dom: '<"d-flex justify-content-between align-items-center mb-2"<"d-flex gap-2"Bl>f>rt<"d-flex justify-content-between"ip>',
      };

      const dt = $(selector).DataTable({ ...defaults, ...options });

      // Raporlama eklentisi
      if (reportOptions) {
        AKEKOS.report.attachToTable(dt, el, reportOptions);
      }

      return dt;
    }
  };

  // ── Raporlama Sistemi ──────────────────────────────────────────────────────
  const report = {
    /**
     * Bir tabloya raporlama çubuğu ekle
     * Bu modüler yapı sayesinde her tablodan bağımsız çalışır.
     */
    attachToTable: function(dt, tableEl, options = {}) {
      const defaults = {
        title: 'Rapor',
        formats: ['pdf', 'xlsx', 'csv', 'print'],
        orientation: 'portrait'
      };
      const opts = { ...defaults, ...options };

      const bar = document.createElement('div');
      bar.className = 'akekos-report-bar mt-2';
      bar.innerHTML = `
        <i class="bi bi-file-earmark-bar-graph-fill text-warning"></i>
        <span class="fw-semibold">Raporla:</span>
        ${opts.formats.includes('xlsx') ? '<button class="btn btn-sm btn-outline-success" data-export="xlsx"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>' : ''}
        ${opts.formats.includes('csv')  ? '<button class="btn btn-sm btn-outline-secondary" data-export="csv"><i class="bi bi-filetype-csv me-1"></i>CSV</button>' : ''}
        ${opts.formats.includes('print')? '<button class="btn btn-sm btn-outline-dark" data-export="print"><i class="bi bi-printer me-1"></i>Yazdır</button>' : ''}
        <span class="ms-auto text-muted small">Toplam: <strong class="record-count">-</strong> kayıt</span>
      `;

      tableEl.closest('.card-body')?.insertBefore(bar, tableEl.closest('table'));

      // Kayıt sayısını güncelle
      const updateCount = () => {
        const info = dt.page.info();
        bar.querySelector('.record-count').textContent = info.recordsDisplay;
      };
      dt.on('draw', updateCount);
      updateCount();

      // Export butonları
      bar.querySelectorAll('[data-export]').forEach(btn => {
        btn.addEventListener('click', () => {
          const fmt = btn.dataset.export;
          AKEKOS.report.export(dt, fmt, opts.title);
        });
      });
    },

    /**
     * Dışa aktar
     */
    export: function(dt, format, title = 'Rapor') {
      if (format === 'xlsx' && typeof XLSX !== 'undefined') {
        const data = dt.rows({ search: 'applied' }).data().toArray();
        const headers = [];
        dt.columns().header().each(function(h) { headers.push($(h).text().trim()); });
        
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data.map(row => {
          if (Array.isArray(row)) return row;
          return Object.values(row);
        })]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title);
        XLSX.writeFile(wb, `${title}_${new Date().toISOString().slice(0,10)}.xlsx`);
        AKEKOS.toast('Excel dosyası indirildi.', 'success');
      } else if (format === 'csv') {
        const rows  = dt.rows({ search: 'applied' }).data().toArray();
        const hdrs  = [];
        dt.columns().header().each(h => hdrs.push($(h).text().trim()));
        const csv = [hdrs, ...rows.map(r => Array.isArray(r) ? r : Object.values(r))]
          .map(r => r.map(c => `"${String(c || '').replace(/"/g,'""')}"`).join(','))
          .join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${title}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        AKEKOS.toast('CSV dosyası indirildi.', 'success');
      } else if (format === 'print') {
        window.print();
      }
    }
  };

  // ── Confirm Dialog ─────────────────────────────────────────────────────────
  const confirm = function(message, onConfirm, options = {}) {
    const opts = { title: 'Onay', confirmText: 'Evet, devam et', cancelText: 'İptal',
      confirmClass: 'btn-danger', ...options };
    
    const modalId = 'confirmModal_' + Date.now();
    const html = `
      <div class="modal fade" id="${modalId}" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content border-0 shadow">
            <div class="modal-header border-0 pb-0">
              <h6 class="modal-title fw-bold">${opts.title}</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body pt-2 text-muted small">${message}</div>
            <div class="modal-footer border-0 pt-0 gap-2">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">${opts.cancelText}</button>
              <button type="button" class="btn ${opts.confirmClass} btn-sm" id="${modalId}_confirm">${opts.confirmText}</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    
    document.getElementById(modalId + '_confirm').addEventListener('click', function() {
      modal.hide();
      onConfirm && onConfirm();
    });
    
    document.getElementById(modalId).addEventListener('hidden.bs.modal', function() {
      this.remove();
    });
    
    modal.show();
  };

  // ── AJAX Form Helper ───────────────────────────────────────────────────────
  const submitForm = async function(form, options = {}) {
    const btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>İşleniyor...'; }

    try {
      const formData = new FormData(form);
      const res  = await fetch(form.action, {
        method: form.method || 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const data = await res.json();
      
      if (data.success) {
        AKEKOS.toast(data.message || 'İşlem başarıyla tamamlandı.', 'success');
        options.onSuccess && options.onSuccess(data);
      } else {
        AKEKOS.toast(data.message || 'Bir hata oluştu.', 'danger');
        options.onError && options.onError(data);
      }
    } catch (err) {
      AKEKOS.toast('Bağlantı hatası.', 'danger');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = options.btnText || 'Kaydet'; }
    }
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    
    // Flash mesajlarını otomatik kapat
    setTimeout(() => {
      document.querySelectorAll('.alert-dismissible').forEach(el => {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(el);
        if (bsAlert) bsAlert.close();
      });
    }, 6000);
  });

  return { toast, table, report, confirm, submitForm };
})();

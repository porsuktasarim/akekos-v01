'use strict';
/**
 * Rol tabanlı erişim kontrolü (RBAC)
 * 
 * Yapı: { rol: { kaynak: ['eylem', ...] } }
 * '*' joker karakter olarak kullanılabilir.
 * 
 * Eylemler: read, create, update, delete, export, import, approve
 */
const permissions = {
  admin: {
    '*': ['*']  // Tam erişim
  },
  
  koordinator: {
    inventory:    ['read', 'create', 'update', 'export'],
    personnel:    ['read', 'create', 'update', 'export'],
    inspection:   ['read', 'create', 'update', 'export', 'approve'],
    operations:   ['read', 'create', 'update', 'approve', 'export'],
    reports:      ['read', 'create', 'export'],
    organizations:['read'],
    users:        ['read', 'create', 'update']
  },
  
  takim_lideri: {
    inventory:    ['read', 'create', 'update'],
    personnel:    ['read', 'update'],
    inspection:   ['read', 'create', 'update'],
    operations:   ['read', 'create', 'update'],
    reports:      ['read', 'create'],
    organizations:['read'],
    users:        ['read']
  },
  
  personel: {
    inventory:    ['read'],
    personnel:    ['read'],
    inspection:   ['read', 'create'],
    operations:   ['read'],
    reports:      ['read'],
    organizations:['read']
  },
  
  gonullu: {
    inventory:    ['read'],
    operations:   ['read'],
    organizations:['read']
  },
  
  gozlemci: {
    inventory:    ['read'],
    personnel:    ['read'],
    inspection:   ['read'],
    operations:   ['read'],
    reports:      ['read'],
    organizations:['read']
  }
};

module.exports = permissions;

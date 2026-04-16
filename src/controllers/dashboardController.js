'use strict';
const Organization = require('../models/Organization');
const User = require('../models/User');

exports.index = async (req, res, next) => {
  try {
    const user = req.session.user;
    const stats = {};
    
    // Temel istatistikler (gelecekte modüllere göre genişleyecek)
    if (user.role === 'admin') {
      stats.totalOrgs  = await Organization.countDocuments({});
      stats.activeOrgs = await Organization.countDocuments({ isActive: true });
      stats.totalUsers = await User.countDocuments({});
      stats.activeUsers= await User.countDocuments({ isActive: true });
    } else {
      // Org scope'a göre sınırlı istatistik
      const orgFilter = req.orgFilter || {};
      stats.orgName = req.currentOrg?.name || '-';
    }
    
    res.render('dashboard/index', {
      title: 'Gösterge Paneli',
      stats,
      user
    });
  } catch (err) { next(err); }
};

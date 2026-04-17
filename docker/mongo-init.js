// MongoDB başlangıç scripti
db = db.getSiblingDB('admin');
db.auth('admin', 'changeme_mongo_root');

db = db.getSiblingDB('akekos');
db.createUser({
  user: 'akekos_user',
  pwd: 'akekos_pass',
  roles: [{ role: 'readWrite', db: 'akekos' }]
});
print('MongoDB akekos kullanıcısı oluşturuldu.');

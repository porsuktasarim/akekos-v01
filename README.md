# AKEKOS - Arama Kurtarma Ekipman Kontrol ve Operasyon Sistemi

> **Arama ve Kurtarma ekipleri için kapsamlı bir yönetim platformu**

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple)
![Docker](https://img.shields.io/badge/Docker-Hazır-blue)

---

## 📌 Faz Durumu

| Faz | Açıklama | Durum |
|-----|----------|-------|
| **Faz 0** | Proje altyapısı, auth, org yapısı, UI iskelet | ✅ Tamamlandı |
| Faz 1 | Envanter Yönetimi Modülü | 🔜 |
| Faz 2 | Personel & Yetkinlik Yönetimi | 🔜 |
| Faz 3 | Sayım ve Kontrol Modülü | 🔜 |
| Faz 4 | Operasyon Yönetimi | 🔜 |
| Faz 5 | Raporlama & Belgelendirme | 🔜 |

---

## 🏗️ Faz 0 - Proje Altyapısı

### Neler Yapıldı?

**Kimlik Doğrulama**
- JWT Access Token (15 dk) + Refresh Token (7 gün)
- Session yönetimi (MongoDB destekli)
- Şifre sıfırlama akışı (e-posta bağlantısı)
- Giriş deneme limiti + hesap kilitleme
- Şifre göster/gizle, "Beni hatırla"

**Organizasyon Yapısı**
- Sınırsız derinlik hiyerarşisi (Materialized Path pattern)
- Merkez → Bölge → İl → İlçe → Birim
- Admin panelinden ağaç görünümü + liste
- Aktif/Pasif toggle
- Her kullanıcı bir organizasyona atanır, erişim yetkisi org kapsamında geçerlidir

**Rol & Yetkilendirme (RBAC)**
- 6 rol: admin, koordinatör, takım lideri, personel, gönüllü, gözlemci
- Kaynak bazlı izin sistemi (`src/config/permissions.js`)
- Org scope middleware (her request'e otomatik filtre)

**Altyapı**
- Express.js MVC + Mongoose
- Winston loglama + Morgan HTTP log
- Multer dosya yükleme
- Rate limiting, Helmet (CSP), MongoDB sanitize
- Modüler hata yönetimi

**UI**
- Bootstrap 5.3 + Bootstrap Icons
- Responsive sidebar (collapse + mobil)
- DataTables (2000+ kayıt desteği)
- Toast bildirim sistemi
- Modüler raporlama (XLSX + CSV client-side)

**Dil Altyapısı**
- `locales/tr.json` ve `locales/en.json`
- `src/config/i18n.js` - noktalı yol çözümleyici
- Template'larda `t('key.subkey')` kullanımı
- `.po` formatına geçiş için genişletilebilir

---

## 📁 Klasör Yapısı

```
akekos-v01/
├── docker/
│   └── mongo-init.js          # MongoDB başlangıç scripti
├── locales/
│   ├── tr.json                # Türkçe dil dosyası
│   └── en.json                # İngilizce dil dosyası
├── public/
│   ├── css/
│   │   ├── main.css           # Ana stil dosyası
│   │   └── auth.css           # Auth sayfaları stili
│   └── js/
│       └── main.js            # AKEKOS JS namespace (toast, tablo, rapor, sidebar)
├── src/
│   ├── config/
│   │   ├── database.js        # MongoDB bağlantı
│   │   ├── i18n.js            # Çoklu dil motoru
│   │   ├── logger.js          # Winston logger
│   │   └── permissions.js     # RBAC izin matrisi
│   ├── controllers/
│   │   ├── authController.js  # JWT, session, şifre sıfırlama
│   │   ├── dashboardController.js
│   │   └── orgController.js   # Organizasyon CRUD + ağaç
│   ├── middlewares/
│   │   ├── auth.js            # verifyToken, requireSession, requireRole, requirePermission
│   │   ├── errorHandler.js    # Merkezi hata yönetimi
│   │   ├── orgScope.js        # Otomatik org filtresi
│   │   └── upload.js          # Multer yapılandırması
│   ├── models/
│   │   ├── Organization.js    # Materialized path hiyerarşi
│   │   └── User.js            # Kullanıcı + güvenlik
│   ├── routes/
│   │   ├── admin.js           # Admin rotaları
│   │   ├── api.js             # REST API v1
│   │   ├── auth.js            # Kimlik doğrulama rotaları
│   │   └── web.js             # Web sayfası rotaları
│   ├── seeds/
│   │   └── index.js           # Test verisi oluşturucu
│   ├── services/
│   │   └── reportService.js   # XLSX/CSV sunucu taraflı rapor
│   ├── views/
│   │   ├── admin/
│   │   │   ├── org/           # Organizasyon yönetim sayfaları
│   │   │   └── users/         # Kullanıcı yönetim sayfaları
│   │   ├── auth/              # Giriş, şifre sıfırlama
│   │   ├── dashboard/         # Ana panel
│   │   ├── errors/            # 403, 404, 500 hata sayfaları
│   │   ├── layouts/           # Ana layout şablonları
│   │   └── partials/          # Sidebar, topbar, flash, footer
│   ├── app.js                 # Express uygulama
│   └── server.js              # HTTP sunucu başlatma
├── .env.example               # Ortam değişkenleri şablonu
├── .gitignore
├── docker-compose.yml         # Portainer/Coolify uyumlu
├── Dockerfile                 # Üretim Docker image
├── nodemon.json               # Geliştirici hot-reload
└── package.json
```

---

## 🚀 Kurulum

### Yerel Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env
# .env dosyasını düzenleyin

# Test verisini oluştur
npm run seed

# Geliştirici modunda başlat
npm run dev
```

### Docker (Portainer / Coolify)

```bash
# .env dosyasını oluştur
cp .env.example .env

# Docker Compose ile başlat
docker compose up -d

# İlk kurulumda seed çalıştır
docker exec akekos-app node src/seeds/index.js
```

**Portainer'da:** Stack → Add Stack → Git Repository olarak bu repoyu ekleyin.

**Coolify'da:** Yeni servis → Docker Compose → bu repoyu bağlayın.

---

## 🔐 Varsayılan Giriş

> Sadece `npm run seed` sonrası geçerlidir.

| Alan | Değer |
|------|-------|
| E-posta | admin@akekos.local |
| Şifre | Admin@2024! |
| Rol | admin |

---

## 🌍 Dil Dosyası

Dil metinleri `locales/tr.json` dosyasında tutulur:

```json
{
  "auth": {
    "login": {
      "title": "Giriş Yap"
    }
  }
}
```

Template'da kullanım: `<%= t('auth.login.title') %>`

Yeni dil eklemek için: `locales/XX.json` oluşturun, `.env` dosyasında `APP_LANG=xx` ayarlayın.

---

## 📊 Modüller (Sonraki Fazlar)

Her modül bağımsız olarak geliştirilecek:

- **Envanter**: Ekipman kaydı, stok takibi, kategoriler, barkod
- **Personel**: Profil, yetkinlikler, sertifikalar, takvim
- **Sayım & Kontrol**: Periyodik kontrol listeleri, fotoğraflı kayıt
- **Operasyon**: Görev ataması, saha takibi, timeline
- **Raporlama**: PDF, Excel raporlar, otomatik sayfa raporlama

---

## 🔌 API

```
GET  /api/v1/ping                    # Sağlık kontrolü
GET  /api/v1/organizations           # Org listesi (JWT gerekli)
GET  /api/v1/organizations/tree      # Org ağacı (JWT gerekli)
```

---

*AKEKOS v0.1.0 - Faz 0 Tamamlandı*

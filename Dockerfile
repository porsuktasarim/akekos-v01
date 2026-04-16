# =============================================
# AKEKOS - Dockerfile
# =============================================
FROM node:20-alpine AS base

# Çalışma dizini
WORKDIR /app

# Bağımlılıklar
COPY package*.json ./
RUN npm ci --only=production

# Uygulama dosyaları
COPY . .

# Yükleme ve log klasörleri
RUN mkdir -p uploads logs

# Kullanıcı (güvenlik)
RUN addgroup -g 1001 -S akekos && \
    adduser -S -u 1001 -G akekos akekos && \
    chown -R akekos:akekos /app
USER akekos

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]

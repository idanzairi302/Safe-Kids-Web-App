#!/usr/bin/env bash
# SafeKids Server Setup Script
# Run as root or with sudo on the production server
set -euo pipefail

APP_DIR="/var/www/safekids"
LOG_DIR="/var/log/safekids"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== SafeKids Production Setup ==="

# 1. Create deployment directories
echo "[1/8] Creating directories..."
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR/backend/uploads"

# 2. Copy project files
echo "[2/8] Copying project files..."
rsync -av --exclude='node_modules' --exclude='.env' --exclude='uploads/*' \
  "$REPO_DIR/backend/" "$APP_DIR/backend/"
rsync -av --exclude='node_modules' \
  "$REPO_DIR/frontend/" "$APP_DIR/frontend/"
cp "$REPO_DIR/deployment/ecosystem.config.js" "$APP_DIR/"

# 3. Set up backend environment
echo "[3/8] Setting up backend environment..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo "WARNING: No .env file found at $APP_DIR/backend/.env"
  echo "Copy .env.production.example and fill in production values:"
  echo "  cp $APP_DIR/backend/.env.production.example $APP_DIR/backend/.env"
  echo "  nano $APP_DIR/backend/.env"
fi

# 4. Install backend dependencies (production only)
echo "[4/8] Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --omit=dev

# 5. Build backend (TypeScript compilation)
echo "[5/8] Building backend..."
npx tsc

# 6. Install frontend dependencies and build
echo "[6/8] Building frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build

# 7. Set permissions
echo "[7/8] Setting permissions..."
chown -R www-data:www-data "$APP_DIR"
chown -R www-data:www-data "$LOG_DIR"
chmod 750 "$APP_DIR/backend/uploads"

# 8. Start with PM2
echo "[8/8] Starting application with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Remaining manual steps:"
echo ""
echo "1. Configure .env file (if not done):"
echo "   cp $APP_DIR/backend/.env.production.example $APP_DIR/backend/.env"
echo "   nano $APP_DIR/backend/.env"
echo ""
echo "2. Set up Nginx:"
echo "   cp $REPO_DIR/deployment/nginx.conf /etc/nginx/sites-available/safekids"
echo "   ln -s /etc/nginx/sites-available/safekids /etc/nginx/sites-enabled/"
echo "   # Edit /etc/nginx/sites-available/safekids and replace YOUR_DOMAIN"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "3. Set up SSL with Let's Encrypt:"
echo "   apt install certbot python3-certbot-nginx"
echo "   certbot --nginx -d YOUR_DOMAIN"
echo ""
echo "4. Set up MongoDB with authentication:"
echo "   mongosh"
echo "   > use admin"
echo "   > db.createUser({ user: 'safekids_user', pwd: 'STRONG_PASSWORD', roles: [{ role: 'readWrite', db: 'safekids' }] })"
echo ""
echo "5. Verify the application:"
echo "   pm2 status"
echo "   pm2 logs safekids-api"
echo "   curl -k https://localhost/api/health"

# 🚀 QUICK DEPLOYMENT GUIDE

## Overview
This guide walks you through deploying Benchmark to production in **2-3 hours**.

All configuration files are already created. You just need to:
1. Copy files to server
2. Install SSL certificate
3. Start services

---

## Prerequisites Checklist

- [ ] Ubuntu 22.04 LTS server (or similar)
- [ ] Domain name pointing to server
- [ ] Root/sudo access
- [ ] Ports 80, 443, 22 open

---

## Step 1: Install Dependencies (30 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PHP 8.2
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php
sudo apt update
sudo apt install -y php8.2 php8.2-fpm php8.2-cli php8.2-mysql php8.2-redis \
  php8.2-mbstring php8.2-xml php8.2-bcmath php8.2-curl php8.2-zip

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx

# Install Supervisor
sudo apt install -y supervisor
sudo systemctl enable supervisor

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js (for building frontend if needed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## Step 2: Setup Database (10 minutes)

```bash
# Login to MySQL
sudo mysql -u root

# Run these commands in MySQL prompt:
CREATE DATABASE benchmark_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'benchmark_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON benchmark_production.* TO 'benchmark_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Step 3: Deploy Application (30 minutes)

```bash
# Create directory
sudo mkdir -p /var/www/benchmark
sudo chown -R $USER:www-data /var/www/benchmark

# Upload your code (use scp, rsync, or git)
# Option A: Using git
cd /var/www/benchmark
git clone YOUR_REPO_URL .

# Option B: Using rsync from local
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /Users/macbook/Benchmark/ user@your-server:/var/www/benchmark/

# Install backend dependencies
cd /var/www/benchmark/backend
composer install --no-dev --optimize-autoloader

# Copy production environment
cp .env.production.example .env
nano .env  # Update: DB_PASSWORD, APP_URL, domain, etc.

# Generate app key
php artisan key:generate

# Run migrations
php artisan migrate --force
php artisan db:seed --force

# Set permissions
sudo chown -R www-data:www-data /var/www/benchmark
sudo chmod -R 755 /var/www/benchmark
sudo chmod -R 775 /var/www/benchmark/backend/storage
sudo chmod -R 775 /var/www/benchmark/backend/bootstrap/cache

# Optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Step 4: Configure Nginx (20 minutes)

```bash
# Copy Nginx configs
sudo cp /var/www/benchmark/config/nginx/benchmark-api.conf \
  /etc/nginx/sites-available/benchmark-api

sudo cp /var/www/benchmark/config/nginx/benchmark-frontend.conf \
  /etc/nginx/sites-available/benchmark-frontend

# Update domain names in configs
sudo nano /etc/nginx/sites-available/benchmark-api
# Replace: api.benchmark.yourdomain.com with your actual domain

sudo nano /etc/nginx/sites-available/benchmark-frontend
# Replace: benchmark.yourdomain.com with your actual domain

# Enable sites
sudo ln -s /etc/nginx/sites-available/benchmark-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/benchmark-frontend /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 5: Install SSL Certificate (15 minutes)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx \
  -d api.benchmark.yourdomain.com \
  -d benchmark.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended: yes)

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Step 6: Setup Horizon (15 minutes)

```bash
# Copy Supervisor config
sudo cp /var/www/benchmark/config/supervisor/benchmark-horizon.conf \
  /etc/supervisor/conf.d/

# Update paths if needed
sudo nano /etc/supervisor/conf.d/benchmark-horizon.conf

# Reload Supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start benchmark-horizon

# Check status
sudo supervisorctl status
```

---

## Step 7: Setup Automated Backups (10 minutes)

```bash
# Create backup directory
sudo mkdir -p /var/backups/benchmark
sudo chown www-data:www-data /var/backups/benchmark

# Copy backup script
sudo cp /var/www/benchmark/scripts/backup-database.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-database.sh

# Update database password in script
sudo nano /usr/local/bin/backup-database.sh

# Test backup
sudo -u www-data /usr/local/bin/backup-database.sh

# Setup cron job
sudo crontab -u www-data -e
# Add this line:
0 3 * * * /usr/local/bin/backup-database.sh >> /var/log/benchmark/backup.log 2>&1
```

---

## Step 8: Setup Monitoring (10 minutes)

```bash
# Create log directory
sudo mkdir -p /var/log/benchmark
sudo chown www-data:www-data /var/log/benchmark

# Copy monitoring script
sudo cp /var/www/benchmark/scripts/production-monitor.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/production-monitor.sh

# Test monitoring
sudo -u www-data /usr/local/bin/production-monitor.sh

# Setup cron job
sudo crontab -u www-data -e
# Add this line:
*/5 * * * * /usr/local/bin/production-monitor.sh >> /var/log/benchmark/monitor.log 2>&1
```

---

## Step 9: Deploy Frontend (10 minutes)

```bash
# Frontend is already built in dist/
# If you need to rebuild:
cd /var/www/benchmark/frontend

# Update API URL in .env
echo "VITE_API_URL=https://api.benchmark.yourdomain.com/api" > .env

# Build (if needed)
npm ci
npm run build

# Files are now in dist/ and served by Nginx
```

---

## Step 10: Final Verification (10 minutes)

```bash
# Check health endpoint
curl https://api.benchmark.yourdomain.com/api/health

# Should return:
# {"status":"healthy","services":{"database":"ok","redis":"ok","cache":"ok"}}

# Test login
curl -X POST https://api.benchmark.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@benchmark.com","password":"password"}'

# Should return user data and token

# Check frontend
curl -I https://benchmark.yourdomain.com
# Should return HTTP 200

# Check Horizon
curl -I https://api.benchmark.yourdomain.com/horizon
# Should return HTTP 200

# Check services
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status redis
sudo supervisorctl status benchmark-horizon

# Check logs
sudo tail -f /var/www/benchmark/backend/storage/logs/laravel.log
sudo tail -f /var/log/nginx/benchmark-api-error.log
```

---

## Step 11: Configure Firewall (5 minutes)

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (important - do first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Post-Deployment Checklist

- [ ] Health check returns HTTP 200
- [ ] Can login via frontend
- [ ] Dashboard loads with data
- [ ] Workflow tested (start-next, submit)
- [ ] Notifications appear
- [ ] Invoice page loads (for CEO/Director)
- [ ] User management works
- [ ] Horizon dashboard accessible
- [ ] Backup script runs successfully
- [ ] Monitor script runs successfully
- [ ] SSL certificate valid
- [ ] All services auto-start on reboot

---

## Rollback Plan

If something goes wrong:

```bash
# Stop services
sudo supervisorctl stop benchmark-horizon
sudo systemctl stop nginx

# Restore from backup
cd /var/www/benchmark/backend
php artisan down

# Rollback database
mysql -u benchmark_user -p benchmark_production < /var/backups/benchmark/benchmark_YYYYMMDD_HHMMSS.sql

# Rollback code
git checkout <previous-commit>
composer install

# Restart
php artisan up
sudo systemctl start nginx
sudo supervisorctl start benchmark-horizon
```

---

## Troubleshooting

### Permission Denied Errors
```bash
sudo chown -R www-data:www-data /var/www/benchmark/backend/storage
sudo chmod -R 775 /var/www/benchmark/backend/storage
```

### 502 Bad Gateway
```bash
# Check PHP-FPM
sudo systemctl status php8.2-fpm
sudo systemctl restart php8.2-fpm

# Check logs
sudo tail -f /var/log/nginx/error.log
```

### Database Connection Failed
```bash
# Check MySQL
sudo systemctl status mysql

# Test connection
mysql -u benchmark_user -p benchmark_production

# Check .env credentials
cat /var/www/benchmark/backend/.env | grep DB_
```

### Horizon Not Processing Jobs
```bash
# Check Supervisor
sudo supervisorctl status

# Restart Horizon
sudo supervisorctl restart benchmark-horizon

# Check logs
sudo tail -f /var/www/benchmark/backend/storage/logs/horizon.log
```

---

## Production URLs

After deployment, access:

- **Frontend**: https://benchmark.yourdomain.com
- **API**: https://api.benchmark.yourdomain.com/api
- **Health**: https://api.benchmark.yourdomain.com/api/health
- **Horizon**: https://api.benchmark.yourdomain.com/horizon

---

## Support

For issues, check:
1. Laravel logs: `/var/www/benchmark/backend/storage/logs/laravel.log`
2. Nginx logs: `/var/log/nginx/benchmark-api-error.log`
3. Horizon logs: `/var/www/benchmark/backend/storage/logs/horizon.log`
4. System logs: `sudo journalctl -u nginx -f`

---

**Total deployment time: ~2-3 hours**

**You're now live in production! 🎉**

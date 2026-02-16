# Benchmark SSL Certificate Installation Guide

## Prerequisites
- Domain pointing to your server
- Ports 80 and 443 open in firewall
- Nginx installed and configured

## Step 1: Install Certbot

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### CentOS/RHEL
```bash
sudo yum install epel-release
sudo yum install certbot python3-certbot-nginx
```

## Step 2: Obtain Certificate

### Option A: Automatic (Recommended)
```bash
# For both API and frontend
sudo certbot --nginx -d api.benchmark.yourdomain.com -d benchmark.yourdomain.com

# Follow prompts:
# - Enter email for renewal notifications
# - Agree to Terms of Service
# - Choose whether to redirect HTTP to HTTPS (recommend: yes)
```

### Option B: Manual (if automatic fails)
```bash
# Get certificate only
sudo certbot certonly --nginx -d api.benchmark.yourdomain.com -d benchmark.yourdomain.com

# Certificate files will be at:
# /etc/letsencrypt/live/benchmark.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/benchmark.yourdomain.com/privkey.pem
```

## Step 3: Verify Installation

```bash
# Check certificate
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Check HTTPS
curl -I https://api.benchmark.yourdomain.com/api/health
curl -I https://benchmark.yourdomain.com
```

## Step 4: Auto-Renewal Setup

Certbot automatically installs a systemd timer for renewal. Verify:

```bash
# Check timer status
sudo systemctl status certbot.timer

# Manual renewal (if needed)
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## Step 5: Nginx Configuration

If using manual certificate, update Nginx configs:

```nginx
# /etc/nginx/sites-available/benchmark-api
ssl_certificate /etc/letsencrypt/live/benchmark.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/benchmark.yourdomain.com/privkey.pem;
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Port 80 not accessible
```bash
# Check firewall
sudo ufw allow 80
sudo ufw allow 443

# Or for firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Certificate renewal fails
```bash
# Check renewal logs
sudo cat /var/log/letsencrypt/letsencrypt.log

# Force renewal
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

### Domain not pointing to server
```bash
# Check DNS
dig api.benchmark.yourdomain.com
nslookup benchmark.yourdomain.com

# Should return your server's IP
```

## Security Best Practices

1. **Strong SSL Configuration** (already in nginx configs)
   - TLS 1.2 and 1.3 only
   - Strong cipher suites
   - HSTS enabled

2. **Certificate Monitoring**
   - Certbot sends renewal emails
   - Set up additional monitoring: `sudo crontab -e`
   ```cron
   0 0 1 * * certbot renew --quiet && systemctl reload nginx
   ```

3. **Backup Certificates**
   ```bash
   sudo cp -r /etc/letsencrypt /var/backups/letsencrypt-$(date +%Y%m%d)
   ```

## Certificate Locations

- **Certificate**: `/etc/letsencrypt/live/benchmark.yourdomain.com/fullchain.pem`
- **Private Key**: `/etc/letsencrypt/live/benchmark.yourdomain.com/privkey.pem`
- **Chain**: `/etc/letsencrypt/live/benchmark.yourdomain.com/chain.pem`
- **Config**: `/etc/letsencrypt/renewal/benchmark.yourdomain.com.conf`

## Renewal Schedule

- Certificates renew every 90 days
- Auto-renewal runs twice daily
- Renewal attempts when <30 days remain
- Email notifications sent 20/10/1 days before expiry

## Post-Installation

1. Update `.env` in backend:
   ```env
   APP_URL=https://api.benchmark.yourdomain.com
   SANCTUM_STATEFUL_DOMAINS=benchmark.yourdomain.com
   SESSION_SECURE_COOKIE=true
   ```

2. Update frontend `.env`:
   ```env
   VITE_API_URL=https://api.benchmark.yourdomain.com/api
   ```

3. Rebuild frontend:
   ```bash
   cd /var/www/benchmark/frontend
   npm run build
   ```

4. Test everything:
   ```bash
   # Health check
   curl https://api.benchmark.yourdomain.com/api/health
   
   # Frontend loads
   curl https://benchmark.yourdomain.com
   
   # Login works
   curl -X POST https://api.benchmark.yourdomain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"ceo@benchmark.com","password":"password"}'
   ```

Done! Your Benchmark system now has HTTPS enabled.

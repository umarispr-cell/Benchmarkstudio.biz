#!/bin/bash

###############################################################################
# Benchmark Production Startup Script
# Starts all required services for production environment
###############################################################################

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="${PROJECT_ROOT}/backend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root (for systemd)
if [ "$EUID" -eq 0 ]; then 
    warn "Running as root. Switch to www-data user for production."
fi

log "Starting Benchmark Production Services..."

# Check MySQL
log "Checking MySQL..."
if ! mysqladmin ping -h localhost --silent 2>/dev/null; then
    error "MySQL is not running. Start with: sudo systemctl start mysql"
fi
log "✓ MySQL is running"

# Check Redis
log "Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    error "Redis is not running. Start with: sudo systemctl start redis"
fi
log "✓ Redis is running"

# Change to backend directory
cd "${BACKEND_DIR}"

# Check .env exists
if [ ! -f .env ]; then
    error ".env file not found in ${BACKEND_DIR}"
fi

# Run migrations (with confirmation in production)
if [ "${APP_ENV}" = "production" ]; then
    read -p "Run database migrations? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Running migrations..."
        php artisan migrate --force
    fi
else
    log "Running migrations..."
    php artisan migrate --force
fi

# Clear and cache config
log "Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
log "✓ Application optimized"

# Start Horizon (if using systemd)
if command -v systemctl &> /dev/null; then
    log "Starting Horizon via systemd..."
    sudo systemctl start benchmark-horizon
    log "✓ Horizon started"
else
    warn "systemd not found. Start Horizon manually: php artisan horizon"
fi

# Show status
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🚀 Benchmark Services Status"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# MySQL status
MYSQL_STATUS=$(mysqladmin ping -h localhost --silent 2>/dev/null && echo "✓ Running" || echo "✗ Not running")
echo "MySQL:    ${MYSQL_STATUS}"

# Redis status
REDIS_STATUS=$(redis-cli ping 2>/dev/null | grep -q PONG && echo "✓ Running" || echo "✗ Not running")
echo "Redis:    ${REDIS_STATUS}"

# Horizon status
if command -v systemctl &> /dev/null; then
    HORIZON_STATUS=$(systemctl is-active benchmark-horizon 2>/dev/null || echo "inactive")
    if [ "$HORIZON_STATUS" = "active" ]; then
        echo "Horizon:  ✓ Running"
    else
        echo "Horizon:  ✗ Not running"
    fi
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""
log "Health check: curl http://localhost:8000/api/health"
log "Horizon dashboard: http://localhost:8000/horizon"
log ""
log "✅ Startup complete!"

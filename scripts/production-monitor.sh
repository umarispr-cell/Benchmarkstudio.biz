#!/bin/bash

###############################################################################
# Benchmark Production Monitor Script
# Monitors system health and sends alerts
###############################################################################

set -e

# Configuration
HEALTH_ENDPOINT="http://localhost:8000/api/health"
ALERT_EMAIL="ops@benchmark.com"
LOG_FILE="/var/log/benchmark/monitor.log"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    # Log alert
    log "ALERT: $subject - $message"
    
    # Send email (if mail is configured)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "[Benchmark] $subject" "$ALERT_EMAIL"
    fi
}

# Check health endpoint
check_health() {
    local response=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" != "200" ]; then
        send_alert "Health Check Failed" "HTTP Status: $http_code\nResponse: $body"
        return 1
    fi
    
    # Check if all services are ok
    if ! echo "$body" | grep -q '"status":"healthy"'; then
        send_alert "Service Unhealthy" "Response: $body"
        return 1
    fi
    
    log "Health check passed"
    return 0
}

# Check MySQL
check_mysql() {
    if ! mysqladmin ping -h localhost --silent 2>/dev/null; then
        send_alert "MySQL Down" "MySQL is not responding"
        return 1
    fi
    log "MySQL check passed"
    return 0
}

# Check Redis
check_redis() {
    if ! redis-cli ping > /dev/null 2>&1; then
        send_alert "Redis Down" "Redis is not responding"
        return 1
    fi
    log "Redis check passed"
    return 0
}

# Check Horizon
check_horizon() {
    if command -v systemctl &> /dev/null; then
        if ! systemctl is-active --quiet benchmark-horizon; then
            send_alert "Horizon Down" "Horizon service is not running"
            return 1
        fi
    fi
    log "Horizon check passed"
    return 0
}

# Check disk space
check_disk() {
    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$usage" -gt 90 ]; then
        send_alert "Disk Space Critical" "Disk usage at ${usage}%"
        return 1
    elif [ "$usage" -gt 80 ]; then
        log "WARNING: Disk usage at ${usage}%"
    fi
    log "Disk check passed (${usage}%)"
    return 0
}

# Main monitoring loop
log "Starting monitoring checks..."

FAILED=0

check_health || FAILED=$((FAILED + 1))
check_mysql || FAILED=$((FAILED + 1))
check_redis || FAILED=$((FAILED + 1))
check_horizon || FAILED=$((FAILED + 1))
check_disk || FAILED=$((FAILED + 1))

if [ $FAILED -gt 0 ]; then
    log "Monitoring completed with $FAILED failures"
    exit 1
else
    log "All checks passed ✓"
    exit 0
fi

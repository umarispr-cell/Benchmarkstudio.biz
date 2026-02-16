#!/bin/bash

###############################################################################
# Benchmark Database Backup Script
# Automates daily MySQL backups with rotation and compression
###############################################################################

# Configuration
BACKUP_DIR="/var/backups/benchmark"
DB_NAME="benchmark_production"
DB_USER="benchmark_user"
DB_PASSWORD="BenchmarkSecure2025"  # Change in production!
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/benchmark_${DATE}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting database backup..."

# Check if MySQL is running
if ! mysqladmin ping -h localhost --silent 2>/dev/null; then
    log "ERROR: MySQL is not running"
    exit 1
fi

# Perform backup
if mysqldump -u "${DB_USER}" -p"${DB_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "${DB_NAME}" | gzip > "${BACKUP_FILE}"; then
    
    # Get backup size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "SUCCESS: Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"
    
    # Delete old backups
    DELETED_COUNT=$(find "${BACKUP_DIR}" -name "benchmark_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
    if [ "${DELETED_COUNT}" -gt 0 ]; then
        log "Deleted ${DELETED_COUNT} old backup(s) older than ${RETENTION_DAYS} days"
    fi
    
    # Count current backups
    CURRENT_BACKUPS=$(find "${BACKUP_DIR}" -name "benchmark_*.sql.gz" | wc -l)
    log "Current backup count: ${CURRENT_BACKUPS}"
    
    exit 0
else
    log "ERROR: Backup failed"
    exit 1
fi

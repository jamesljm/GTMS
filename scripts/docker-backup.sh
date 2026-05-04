#!/bin/sh
# Runs inside a Docker container. Backs up the GTMS Postgres database
# to /backups daily at 02:00 (container timezone), with 30-day retention.

set -e

BACKUP_DIR=/backups
RETENTION_DAYS=30
LOG_FILE="$BACKUP_DIR/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

run_backup() {
    DATE=$(date '+%Y-%m-%d')
    DATED_FILE="$BACKUP_DIR/gtms-$DATE.sql"
    LATEST_FILE="$BACKUP_DIR/gtms-latest.sql"
    TMP_FILE="/tmp/gtms-dump-$$.sql"

    log "Starting backup..."

    if pg_dump -h postgres -U postgres gtms > "$TMP_FILE"; then
        SIZE=$(stat -c%s "$TMP_FILE" 2>/dev/null || echo 0)
        if [ "$SIZE" -lt 1024 ]; then
            log "ERROR: dump file too small ($SIZE bytes), aborting"
            rm -f "$TMP_FILE"
            return 1
        fi
        mv "$TMP_FILE" "$DATED_FILE"
        cp "$DATED_FILE" "$LATEST_FILE"
        SIZE_HUMAN=$(du -h "$DATED_FILE" | cut -f1)
        log "Backup created: gtms-$DATE.sql ($SIZE_HUMAN)"

        # Strict cleanup: only files matching gtms-YYYY-MM-DD.sql, older than retention
        find "$BACKUP_DIR" -maxdepth 1 -type f -name 'gtms-????-??-??.sql' -mtime +$RETENTION_DAYS -print 2>/dev/null | while read -r f; do
            rm -f "$f"
            log "Deleted old backup: $(basename "$f")"
        done

        log "Backup complete."
    else
        log "ERROR: pg_dump failed"
        rm -f "$TMP_FILE"
        return 1
    fi
}

calc_sleep_to_target() {
    # Args: $1=hour, $2=minute - returns seconds until next occurrence
    TARGET_H=$1
    TARGET_M=$2
    NOW_H=$(date +%H)
    NOW_M=$(date +%M)
    NOW_S=$(date +%S)
    NOW_SINCE_MIDNIGHT=$(( 10#$NOW_H * 3600 + 10#$NOW_M * 60 + 10#$NOW_S ))
    TARGET_SINCE_MIDNIGHT=$(( TARGET_H * 3600 + TARGET_M * 60 ))
    if [ $NOW_SINCE_MIDNIGHT -lt $TARGET_SINCE_MIDNIGHT ]; then
        echo $(( TARGET_SINCE_MIDNIGHT - NOW_SINCE_MIDNIGHT ))
    else
        echo $(( 86400 - NOW_SINCE_MIDNIGHT + TARGET_SINCE_MIDNIGHT ))
    fi
}

mkdir -p "$BACKUP_DIR"
log "Backup container started. Retention: $RETENTION_DAYS days. Target: 02:00 daily."

# Run an immediate backup so we know it works
run_backup || true

# Then loop, waiting until 02:00 each day
while true; do
    SLEEP_SECS=$(calc_sleep_to_target 2 0)
    log "Next backup in $SLEEP_SECS seconds."
    sleep "$SLEEP_SECS"
    run_backup || true
done

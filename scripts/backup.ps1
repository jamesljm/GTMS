$ErrorActionPreference = "Stop"

$BackupDir = "C:\Users\Harmen\Documents\TempHost\GTMS-Backups"
$RetentionDays = 30
$ProjectDir = "C:\Users\Harmen\Documents\TempHost\GTMS"
$LogFile = Join-Path $BackupDir "backup.log"

$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$Date = Get-Date -Format "yyyy-MM-dd"
$DatedFile = Join-Path $BackupDir "gtms-$Date.sql"
$LatestFile = Join-Path $BackupDir "gtms-latest.sql"

function Write-Log {
    param($Message)
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

try {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }

    Write-Log "Starting backup..."

    Set-Location $ProjectDir

    $TempFile = Join-Path $env:TEMP "gtms-dump-$Timestamp.sql"
    docker compose exec -T postgres pg_dump -U postgres gtms | Out-File -FilePath $TempFile -Encoding utf8

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    $size = (Get-Item $TempFile).Length
    if ($size -lt 1024) {
        throw "Backup file is suspiciously small ($size bytes) - aborting"
    }

    Move-Item -Path $TempFile -Destination $DatedFile -Force
    Copy-Item -Path $DatedFile -Destination $LatestFile -Force

    $sizeMB = [math]::Round($size / 1MB, 2)
    Write-Log "Backup created: gtms-$Date.sql ($sizeMB MB)"

    # Strict cleanup: only files matching exact pattern gtms-YYYY-MM-DD.sql, older than retention
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    $pattern = '^gtms-\d{4}-\d{2}-\d{2}\.sql$'
    $oldFiles = Get-ChildItem -Path $BackupDir -File |
        Where-Object { $_.Name -match $pattern -and $_.LastWriteTime -lt $cutoff }
    foreach ($f in $oldFiles) {
        Remove-Item -LiteralPath $f.FullName -Force
        Write-Log "Deleted old backup: $($f.Name)"
    }

    Write-Log "Backup complete."
} catch {
    Write-Log "ERROR: $_"
    exit 1
}

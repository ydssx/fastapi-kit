# One command: start full stack (postgres, redis, api, celery-worker, celery-beat)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$Detached = $false
$ComposeArgs = @("up", "--build")

foreach ($arg in $args) {
    switch ($arg) {
        { $_ -in "-d", "--detach" } { $Detached = $true }
        default { $ComposeArgs += $arg }
    }
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is not running. Start Docker Desktop and retry."
}

if ($Detached) {
    $ComposeArgs += "-d"
}

Write-Host "Starting full stack..."
docker compose @ComposeArgs

if ($Detached) {
    Write-Host ""
    Write-Host "Waiting for API..."
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
        Start-Sleep -Seconds 2
    }
    Write-Host ""
    docker compose ps
    Write-Host ""
    Write-Host "Full stack is up:"
    Write-Host "  API docs:  http://localhost:8000/docs"
    Write-Host "  Health:    http://localhost:8000/health"
    Write-Host "  Stop:      docker compose down"
}

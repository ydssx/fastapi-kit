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

if (-not ((Test-Path "docker/certs/cert.pem") -and (Test-Path "docker/certs/key.pem"))) {
    Write-Host "Generating local TLS certs (docker/certs/)..."
    bash scripts/gen_dev_certs.sh
    if ($LASTEXITCODE -ne 0) { throw "gen_dev_certs.sh failed" }
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
            $params = @{
                Uri             = "https://localhost/health"
                UseBasicParsing = $true
                TimeoutSec      = 2
            }
            if ($PSVersionTable.PSVersion.Major -ge 7) {
                $params.SkipCertificateCheck = $true
            }
            $r = Invoke-WebRequest @params
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
        Start-Sleep -Seconds 2
    }
    Write-Host ""
    docker compose ps
    Write-Host ""
    Write-Host "Full stack is up (local self-signed TLS):"
    Write-Host "  Admin:     https://localhost/admin/"
    Write-Host "  API docs:  https://localhost/docs"
    Write-Host "  Health:    https://localhost/health"
    Write-Host ""
    Write-Host "  Admin hot reload: docker compose --profile admin-dev up -d admin-dev"
    Write-Host "    then http://localhost:5173/admin/"
    Write-Host "  HTTP :8000 redirects to HTTPS. Trust the cert in the browser to silence warnings."
    Write-Host "  Stop:      docker compose down"
}

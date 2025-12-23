# Docker Test Environment Management Script (PowerShell)
# Usage: .\docker-test.ps1 [command]

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

$ComposeFile = "docker-compose.test.yml"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location $ScriptDir

switch ($Command.ToLower()) {
    "build" {
        Write-Host "🔨 Building containers..." -ForegroundColor Cyan
        docker compose -f $ComposeFile build --no-cache
        Write-Host "✅ Build complete!" -ForegroundColor Green
    }
    
    "start" {
        Write-Host "🚀 Starting containers..." -ForegroundColor Cyan
        docker compose -f $ComposeFile up -d
        Write-Host "✅ Containers started!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Container status:" -ForegroundColor Cyan
        docker compose -f $ComposeFile ps
        Write-Host ""
        Write-Host "🌐 Application: http://localhost:3000" -ForegroundColor Yellow
        Write-Host "📝 View logs: .\docker-test.ps1 logs" -ForegroundColor Yellow
    }
    
    "stop" {
        Write-Host "🛑 Stopping containers..." -ForegroundColor Cyan
        docker compose -f $ComposeFile down
        Write-Host "✅ Containers stopped!" -ForegroundColor Green
    }
    
    "restart" {
        Write-Host "🔄 Restarting containers..." -ForegroundColor Cyan
        docker compose -f $ComposeFile restart
        Write-Host "✅ Containers restarted!" -ForegroundColor Green
    }
    
    "logs" {
        Write-Host "📋 Showing logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker compose -f $ComposeFile logs -f
    }
    
    "logs-homarr" {
        Write-Host "📋 Showing Homarr logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker compose -f $ComposeFile logs -f homarr-test
    }
    
    "logs-redis" {
        Write-Host "📋 Showing Redis logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker compose -f $ComposeFile logs -f redis-test
    }
    
    "clean" {
        Write-Host "🧹 Cleaning up containers and volumes..." -ForegroundColor Cyan
        docker compose -f $ComposeFile down -v
        Write-Host "✅ Cleanup complete!" -ForegroundColor Green
    }
    
    "clean-all" {
        Write-Host "🧹 Cleaning up containers, volumes, and test data..." -ForegroundColor Cyan
        docker compose -f $ComposeFile down -v
        if (Test-Path "test-data") { Remove-Item -Recurse -Force "test-data" }
        if (Test-Path "redis-data") { Remove-Item -Recurse -Force "redis-data" }
        Write-Host "✅ Complete cleanup done!" -ForegroundColor Green
    }
    
    "shell" {
        Write-Host "🐚 Opening shell in Homarr container..." -ForegroundColor Cyan
        docker compose -f $ComposeFile exec homarr-test sh
    }
    
    "status" {
        Write-Host "📊 Container status:" -ForegroundColor Cyan
        docker compose -f $ComposeFile ps
        Write-Host ""
        Write-Host "💾 Resource usage:" -ForegroundColor Cyan
        $containerIds = docker compose -f $ComposeFile ps -q
        if ($containerIds) {
            docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $containerIds
        } else {
            Write-Host "No running containers" -ForegroundColor Yellow
        }
    }
    
    "rebuild" {
        Write-Host "🔨 Rebuilding and starting containers..." -ForegroundColor Cyan
        docker compose -f $ComposeFile down
        docker compose -f $ComposeFile build --no-cache
        docker compose -f $ComposeFile up -d
        Write-Host "✅ Rebuild complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Container status:" -ForegroundColor Cyan
        docker compose -f $ComposeFile ps
        Write-Host ""
        Write-Host "🌐 Application: http://localhost:3000" -ForegroundColor Yellow
    }
    
    "health" {
        Write-Host "🏥 Checking health..." -ForegroundColor Cyan
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health/live" -UseBasicParsing -TimeoutSec 5
            Write-Host "✅ Application is healthy!" -ForegroundColor Green
            $response.Content | ConvertFrom-Json | ConvertTo-Json
        } catch {
            Write-Host "❌ Application is not responding" -ForegroundColor Red
            Write-Host "Check logs with: .\docker-test.ps1 logs" -ForegroundColor Yellow
        }
    }
    
    default {
        Write-Host "Docker Test Environment Management" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage: .\docker-test.ps1 [command]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Cyan
        Write-Host "  build       - Build containers (no cache)"
        Write-Host "  start       - Start containers in background"
        Write-Host "  stop        - Stop containers"
        Write-Host "  restart     - Restart containers"
        Write-Host "  rebuild     - Rebuild and start containers"
        Write-Host "  logs        - Show all logs (follow mode)"
        Write-Host "  logs-homarr - Show Homarr logs only"
        Write-Host "  logs-redis  - Show Redis logs only"
        Write-Host "  status      - Show container status and resource usage"
        Write-Host "  health      - Check application health"
        Write-Host "  shell       - Open shell in Homarr container"
        Write-Host "  clean       - Stop and remove containers and volumes"
        Write-Host "  clean-all   - Clean everything including test data"
        Write-Host "  help        - Show this help message"
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Yellow
        Write-Host "  .\docker-test.ps1 rebuild    # Rebuild and start"
        Write-Host "  .\docker-test.ps1 logs       # Watch logs"
        Write-Host "  .\docker-test.ps1 status     # Check status"
    }
}


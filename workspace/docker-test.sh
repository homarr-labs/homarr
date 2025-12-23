#!/bin/bash
# Docker Test Environment Management Script
# Usage: ./docker-test.sh [command]
# Commands: build, start, stop, restart, logs, clean, shell

set -e

COMPOSE_FILE="docker-compose.test.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

case "${1:-help}" in
  build)
    echo "🔨 Building containers..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    echo "✅ Build complete!"
    ;;
  
  start)
    echo "🚀 Starting containers..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo "✅ Containers started!"
    echo ""
    echo "📊 Container status:"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "🌐 Application: http://localhost:3000"
    echo "📝 View logs: ./docker-test.sh logs"
    ;;
  
  stop)
    echo "🛑 Stopping containers..."
    docker compose -f "$COMPOSE_FILE" down
    echo "✅ Containers stopped!"
    ;;
  
  restart)
    echo "🔄 Restarting containers..."
    docker compose -f "$COMPOSE_FILE" restart
    echo "✅ Containers restarted!"
    ;;
  
  logs)
    echo "📋 Showing logs (Ctrl+C to exit)..."
    docker compose -f "$COMPOSE_FILE" logs -f
    ;;
  
  logs-homarr)
    echo "📋 Showing Homarr logs (Ctrl+C to exit)..."
    docker compose -f "$COMPOSE_FILE" logs -f homarr-test
    ;;
  
  logs-redis)
    echo "📋 Showing Redis logs (Ctrl+C to exit)..."
    docker compose -f "$COMPOSE_FILE" logs -f redis-test
    ;;
  
  clean)
    echo "🧹 Cleaning up containers and volumes..."
    docker compose -f "$COMPOSE_FILE" down -v
    echo "✅ Cleanup complete!"
    ;;
  
  clean-all)
    echo "🧹 Cleaning up containers, volumes, and test data..."
    docker compose -f "$COMPOSE_FILE" down -v
    rm -rf test-data redis-data
    echo "✅ Complete cleanup done!"
    ;;
  
  shell)
    echo "🐚 Opening shell in Homarr container..."
    docker compose -f "$COMPOSE_FILE" exec homarr-test sh
    ;;
  
  status)
    echo "📊 Container status:"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "💾 Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
      $(docker compose -f "$COMPOSE_FILE" ps -q) 2>/dev/null || echo "No running containers"
    ;;
  
  rebuild)
    echo "🔨 Rebuilding and starting containers..."
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" build --no-cache
    docker compose -f "$COMPOSE_FILE" up -d
    echo "✅ Rebuild complete!"
    echo ""
    echo "📊 Container status:"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "🌐 Application: http://localhost:3000"
    ;;
  
  health)
    echo "🏥 Checking health..."
    if curl -s http://localhost:3000/api/health/live > /dev/null 2>&1; then
      echo "✅ Application is healthy!"
      curl -s http://localhost:3000/api/health/live | jq . 2>/dev/null || curl -s http://localhost:3000/api/health/live
    else
      echo "❌ Application is not responding"
      echo "Check logs with: ./docker-test.sh logs"
    fi
    ;;
  
  help|*)
    echo "Docker Test Environment Management"
    echo ""
    echo "Usage: ./docker-test.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build       - Build containers (no cache)"
    echo "  start       - Start containers in background"
    echo "  stop        - Stop containers"
    echo "  restart     - Restart containers"
    echo "  rebuild     - Rebuild and start containers"
    echo "  logs        - Show all logs (follow mode)"
    echo "  logs-homarr - Show Homarr logs only"
    echo "  logs-redis  - Show Redis logs only"
    echo "  status      - Show container status and resource usage"
    echo "  health      - Check application health"
    echo "  shell       - Open shell in Homarr container"
    echo "  clean       - Stop and remove containers and volumes"
    echo "  clean-all   - Clean everything including test data"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./docker-test.sh rebuild    # Rebuild and start"
    echo "  ./docker-test.sh logs      # Watch logs"
    echo "  ./docker-test.sh status     # Check status"
    ;;
esac


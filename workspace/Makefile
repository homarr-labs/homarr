.PHONY: help build start stop restart rebuild logs logs-homarr logs-redis status health shell clean clean-all

COMPOSE_FILE = docker-compose.test.yml

help: ## Show this help message
	@echo "Docker Test Environment Management"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build containers (no cache)
	docker compose -f $(COMPOSE_FILE) build --no-cache

start: ## Start containers in background
	docker compose -f $(COMPOSE_FILE) up -d
	@echo ""
	@echo "📊 Container status:"
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "🌐 Application: http://localhost:3000"

stop: ## Stop containers
	docker compose -f $(COMPOSE_FILE) down

restart: ## Restart containers
	docker compose -f $(COMPOSE_FILE) restart

rebuild: ## Rebuild and start containers
	docker compose -f $(COMPOSE_FILE) down
	docker compose -f $(COMPOSE_FILE) build --no-cache
	docker compose -f $(COMPOSE_FILE) up -d
	@echo ""
	@echo "📊 Container status:"
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "🌐 Application: http://localhost:3000"

logs: ## Show all logs (follow mode)
	docker compose -f $(COMPOSE_FILE) logs -f

logs-homarr: ## Show Homarr logs only
	docker compose -f $(COMPOSE_FILE) logs -f homarr-test

logs-redis: ## Show Redis logs only
	docker compose -f $(COMPOSE_FILE) logs -f redis-test

status: ## Show container status and resource usage
	@echo "📊 Container status:"
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "💾 Resource usage:"
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $$(docker compose -f $(COMPOSE_FILE) ps -q) 2>/dev/null || echo "No running containers"

health: ## Check application health
	@echo "🏥 Checking health..."
	@curl -s http://localhost:3000/api/health/live > /dev/null 2>&1 && echo "✅ Application is healthy!" || echo "❌ Application is not responding"

shell: ## Open shell in Homarr container
	docker compose -f $(COMPOSE_FILE) exec homarr-test sh

clean: ## Stop and remove containers and volumes
	docker compose -f $(COMPOSE_FILE) down -v

clean-all: ## Clean everything including test data
	docker compose -f $(COMPOSE_FILE) down -v
	rm -rf test-data redis-data


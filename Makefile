.DEFAULT_GOAL := help

UV := uv
RUN := $(UV) run

.PHONY: help install sync dev-init dev run worker beat \
	certs up up-ha down logs migrate rolling-update \
	admin-dev admin-docker-dev admin-build create-admin \
	creator-dev creator-build promote-creator-pro \
	lint format typecheck test check ci clean

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?##' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (dev extras)
	$(UV) sync --all-extras

sync: install

dev-init: ## Start Postgres + Redis in Docker for local API dev
	bash scripts/init_dev.sh

dev: ## Run API locally with hot reload
	$(RUN) uvicorn app.main:app --reload

run: dev

worker: ## Run Celery worker
	$(RUN) celery -A app.tasks.celery_app worker -l info

beat: ## Run Celery Beat (single instance in production)
	$(RUN) celery -A app.tasks.celery_app beat -l info

certs: ## Generate local self-signed TLS certs for Caddy (docker/certs/)
	bash scripts/gen_dev_certs.sh

up: ## Start full Docker stack (detached, 1 API replica)
	bash scripts/start.sh -d

up-ha: ## Start stack with 2 API replicas (zero-downtime capable)
	SCALE_API=2 bash scripts/start.sh -d

rolling-update: ## Rolling replace API containers (requires up-ha / SCALE_API>=2)
	bash scripts/rolling_update.sh

down: ## Stop Docker stack
	bash scripts/stop.sh

logs: ## Follow Docker Compose logs
	docker compose logs -f

migrate: ## Apply Alembic migrations
	$(RUN) alembic upgrade head

create-admin: ## Create or promote an admin user (EMAIL=... PASSWORD=...)
	$(RUN) python scripts/create_admin.py --email "$(EMAIL)" --password "$(PASSWORD)"

admin-dev: ## Run admin SPA dev server on host (Vite :5173, proxies /api to https://localhost)
	cd admin && npm run dev

admin-docker-dev: ## Run admin Vite in Docker (requires stack up; profile admin-dev)
	docker compose --profile admin-dev up -d admin-dev

admin-build: ## Build admin SPA on host (optional; compose rebuilds admin into proxy image)
	cd admin && npm ci && npm run build

creator-dev: ## Run creator SPA dev server (:5174, proxies /api to https://localhost)
	cd creator && npm run dev

creator-build: ## Build creator SPA on host (optional; compose rebuilds into proxy image)
	cd creator && npm ci && npm run build

promote-creator-pro: ## Set users.plan=pro (EMAIL=...)
	$(RUN) python scripts/promote_creator_pro.py --email "$(EMAIL)"

lint: ## Ruff lint
	$(RUN) ruff check .

format: ## Ruff format
	$(RUN) ruff format .

typecheck: ## Mypy (app/)
	$(RUN) mypy app

test: ## Pytest
	$(RUN) pytest -v

check: lint typecheck test ## Lint, typecheck, and test (same as CI)

ci: check

clean: ## Remove caches and bytecode
	rm -rf .pytest_cache .mypy_cache .ruff_cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

.DEFAULT_GOAL := help

UV := uv
RUN := $(UV) run
PYTHON := python

.PHONY: help install sync dev-init dev run worker beat \
	certs up up-ha down logs migrate rolling-update \
	admin-install admin-dev admin-docker-dev admin-build create-admin \
	admin-check creator-install creator-dev creator-build creator-check \
	frontend-install frontend-check promote-creator-pro \
	lint format typecheck test check ci clean

help: ## Show available targets
	@$(PYTHON) -c "import pathlib,re; rows=[]; [rows.append((m.group(1),m.group(2))) for line in pathlib.Path('Makefile').read_text().splitlines() if (m:=re.match(r'^([A-Za-z0-9_-]+):.*?## (.*)', line))]; [print(f'  {name:<16} {desc}') for name,desc in sorted(rows)]"

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

admin-install: ## Install admin SPA dependencies
	cd admin && npm install

admin-build: ## Build admin SPA on host (optional; compose rebuilds admin into proxy image)
	cd admin && npm run build

admin-check: ## Lint and build admin SPA
	cd admin && npm run lint && npm run build

creator-install: ## Install creator SPA dependencies
	cd creator && npm install

creator-dev: ## Run creator SPA dev server (:5174, proxies /api to https://localhost)
	cd creator && npm run dev

creator-build: ## Build creator SPA on host (optional; compose rebuilds into proxy image)
	cd creator && npm run build

creator-check: ## Lint and build creator SPA
	cd creator && npm run lint && npm run build

frontend-check: admin-check creator-check ## Lint and build both SPAs

frontend-install: admin-install creator-install ## Install both SPA dependency trees

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

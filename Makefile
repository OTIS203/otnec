.PHONY: help setup test lint docker-up docker-down

help:
	@echo "NetScope Platform Makefile Commands:"
	@echo "  make setup        - Install dependencies across Go, Python, and Node"
	@echo "  make test         - Run unit & integration tests across all tiers"
	@echo "  make lint         - Run linters (golangci-lint, ruff, eslint)"
	@echo "  make docker-up    - Start full local stack with docker-compose"
	@echo "  make docker-down  - Stop local stack and clean up containers"

setup:
	cd agent && go mod tidy
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

test:
	cd agent && go test -v -race ./...
	cd backend && pytest -v
	cd frontend && npm test -- --run

lint:
	cd agent && go vet ./...
	cd backend && ruff check app/
	cd frontend && npm run lint

docker-up:
	docker compose -f deploy/docker-compose.yml up -d

docker-down:
	docker compose -f deploy/docker-compose.yml down


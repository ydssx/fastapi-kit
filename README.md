# FastAPI Microservice Template

A production-ready FastAPI microservice template with comprehensive features for building scalable and maintainable applications.

## Features

- **FastAPI Framework**: High-performance async web framework
- **Database Integration**: 
  - SQLAlchemy ORM with async support
  - Alembic for database migrations
  - PostgreSQL as primary database
- **Authentication & Security**:
  - JWT token authentication
  - Role-based access control
  - Environment variables management
- **Docker Support**:
  - Multi-stage Docker builds
  - Docker Compose for local development
  - Production-ready container configuration
- **Monitoring & Logging**:
  - Prometheus metrics integration
  - Structured logging with rotation
  - Health check endpoints
- **Documentation**:
  - Interactive API documentation (Swagger UI)
  - ReDoc alternative documentation
  - OpenAPI specification
- **Development Tools**:
  - Makefile for common operations
  - Pre-configured development settings
  - Code formatting and linting

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd windsurf-project
```

2. Set up the environment:
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
```

3. Start the service:

### Using Python directly:
```bash
# Development mode
uvicorn main:app --reload

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Using Docker:
```bash
# Build and start services
docker-compose up --build

# Run in background
docker-compose up -d
```

The API will be available at:
- API Endpoint: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Metrics: http://localhost:8000/metrics

## Project Structure

```
.
├── app/                    # Application package
│   ├── api/               # API endpoints
│   │   ├── v1/           # API version 1
│   │   └── deps.py       # Dependencies and utilities
│   ├── core/             # Core functionality
│   │   ├── config.py     # Configuration management
│   │   └── security.py   # Security utilities
│   ├── crud/             # CRUD operations
│   ├── db/               # Database
│   │   └── session.py    # Database session
│   ├── models/           # SQLAlchemy models
│   └── schemas/          # Pydantic schemas
├── alembic/              # Database migrations
├── scripts/              # Utility scripts
├── tests/               # Test suite
├── .env                 # Environment variables
├── alembic.ini          # Alembic configuration
├── docker-compose.yml   # Docker compose configuration
├── Dockerfile           # Docker build file
├── main.py             # Application entry point
├── Makefile            # Development commands
└── requirements.txt    # Python dependencies
```

## Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` and adjust the values:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/db_name
SECRET_KEY=your-secret-key
ENVIRONMENT=development
```

## Development

Common development tasks are automated in the Makefile:

```bash
# Format code
make format

# Run linting
make lint

# Run tests
make test

# Generate migrations
make migrations

# Apply migrations
make migrate
```

## Deployment

The application is containerized and can be deployed using Docker:

```bash
# Build production image
docker build -t windsurf-project:latest .

# Run container
docker run -p 8000:8000 windsurf-project:latest
```

For production deployment, ensure to:
1. Set appropriate environment variables
2. Configure database connections
3. Set up monitoring and logging
4. Configure reverse proxy (e.g., Nginx)
5. Set up SSL/TLS certificates

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Taksdown

A fast SvelteKit project created with skit-fast-cli and comprehensive Coolify integration.

## Features

- ⚡ SvelteKit with TypeScript
- 🎨 Tailwind CSS with all features enabled
- 📝 ESLint and Prettier configured
- 🖥️ Tauri integration for Desktop apps
- 🐳 Docker ready with optimized multi-stage build
- 🚀 Complete Coolify deployment with auto-provisioned infrastructure
- 🗄️ Pocketbase database with persistent storage
- 🔗 Service networking and health checks configured
- ⚙️ Comprehensive environment configuration

## Development

```bash
# Install dependencies
npm install

# One-click local development setup
./setup-dev.sh

# Or start services manually:
npm run services:start    # Start database, cache & AI services
npm run dev               # Start SvelteKit development server
```

### Quick Setup Script

The easiest way to get started is with the included setup script:

```bash
./setup-dev.sh
```

This script will:

- Check for Docker installation
- Start all required local services
- Display service URLs and next steps
- Provide helpful commands for development

### Local Development Commands

```bash
# One-click setup with guidance
./setup-dev.sh

# Manual service management
npm run services:start   # Start all local services (DB, Redis, AI services)
npm run services:stop    # Stop all local services
npm run services:logs    # View logs from all services

# PocketBase setup (after starting services)
npm run pocketbase:setup # Set up required collections for sync

# SvelteKit development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Development teardown
npm run dev:teardown     # Stop all services when done
```

### Local Services

When you run `npm run services:start`, the following services will be available:

- **PocketBase**: http://localhost:8090 (Database + Admin UI)

Your SvelteKit app will automatically connect to these services using the environment variables in `.env`.

### PocketBase Setup

After starting the services, you need to set up PocketBase collections for sync functionality:

1. **Manual Setup**: Go to http://localhost:8090/\_/ and create the required collections
2. **Automated Setup**: Run `npm run pocketbase:setup` (requires admin credentials)

For detailed setup instructions, see [docs/POCKETBASE_SETUP.md](docs/POCKETBASE_SETUP.md).

## Tauri Desktop/Mobile App

```bash
# Run the desktop app in development
npm run tauri:dev

# Build the desktop app
npm run tauri:build
```

## Docker

```bash
# Build Docker image
npm run docker:build

# Run with docker-compose (includes all services)
docker-compose up
```

## Coolify Deployment

Your project has been automatically configured with a complete infrastructure in Coolify:

### Services Created

- **SvelteKit App**: Containerized application with health checks and auto-deployment
- **PocketBase**: Database service with persistent storage and admin interface
- **Network**: All services connected via dedicated network for inter-service communication

### Deployment Commands

```bash
# Deploy to production
npm run deploy:prod

# Deploy to development
npm run deploy:dev

# Deploy PR preview
npm run deploy:pr
```

### Health Monitoring

Your application includes a health check endpoint at `/health` that monitors:

- Application status and uptime
- Service connectivity (database, cache, AI services)
- Environment configuration

### Environment Variables

All service connections are pre-configured in your `.env` file:

- `VITE_POCKETBASE_URL`: PocketBase server URL (defaults to http://localhost:8090 in development)

For production deployment, set:

```env
VITE_POCKETBASE_URL=https://your-pocketbase-server.com
```

## Services

### Database: pocketbase

PocketBase provides a complete backend with admin UI, real-time subscriptions, and file storage.

- **Development**: Available at http://localhost:8090
- **Production**: Auto-configured in Coolify with persistent storage

## GitHub Actions

GitHub Actions workflows are included but disabled by default. To enable:

1. Set up repository secrets:
   - `DOCKER_REGISTRY`
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `COOLIFY_WEBHOOK_URL`
   - `COOLIFY_DEV_WEBHOOK_URL`
   - `COOLIFY_API_URL`
   - `COOLIFY_API_TOKEN`
   - `COOLIFY_PROJECT_ID`

2. Edit `.github/workflows/*.yml` and change `if: false` to `if: true`

Features:

- **Production deployment**: Automatic deployment on main branch
- **Development deployment**: Automatic deployment on dev/develop branches
- **PR previews**: Temporary deployments for each pull request
- **Automatic cleanup**: PR deployments removed when PR is closed

## License

MIT

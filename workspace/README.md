# Workspace - Docker Testing Environment

This folder contains Docker test configurations for testing the libsql-js migration and other optimizations.

**📖 For a complete summary of all changes, see [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)**

## Quick Start

### Option 1: Using Management Scripts (Recommended)

**Linux/macOS:**
```bash
cd workspace
./docker-test.sh rebuild    # Build and start
./docker-test.sh logs       # View logs
./docker-test.sh status     # Check status
./docker-test.sh stop       # Stop containers
```

**Windows (PowerShell):**
```powershell
cd workspace
.\docker-test.ps1 rebuild    # Build and start
.\docker-test.ps1 logs       # View logs
.\docker-test.ps1 status     # Check status
.\docker-test.ps1 stop       # Stop containers
```

**Available Commands:**
- `build` - Build containers (no cache)
- `start` - Start containers in background
- `stop` - Stop containers
- `restart` - Restart containers
- `rebuild` - Rebuild and start containers
- `logs` - Show all logs (follow mode)
- `logs-homarr` - Show Homarr logs only
- `logs-redis` - Show Redis logs only
- `status` - Show container status and resource usage
- `health` - Check application health
- `shell` - Open shell in Homarr container
- `clean` - Stop and remove containers and volumes
- `clean-all` - Clean everything including test data
- `help` - Show help message

### Option 2: Using Docker Compose Directly

**Build and Run:**
```bash
cd workspace
docker-compose -f docker-compose.test.yml up --build
```

**Stop Containers:**
```bash
docker-compose -f docker-compose.test.yml down
```

**View Logs:**
```bash
docker-compose -f docker-compose.test.yml logs -f
```

### Application Access

- Application: http://localhost:3000
- Redis: localhost:6379

## Test Database

The test database is stored in `./test-data/db/db.sqlite`. This is a persistent volume, so data will persist between container restarts.

To reset the database:
```bash
rm -rf test-data/db/db.sqlite
```

## Environment Variables

The test environment uses:
- `DB_DRIVER=libsql` (new async driver)
- `DB_URL=file:/appdata/db/db.sqlite`
- `REDIS_IS_EXTERNAL=false` (uses internal Redis)

## Migration Testing

To test the migration from better-sqlite3 to libsql-js:

1. Start with better-sqlite3:
   ```bash
   # Edit docker-compose.test.yml: DB_DRIVER=better-sqlite3
   docker-compose -f docker-compose.test.yml up
   ```

2. Migrate to libsql:
   ```bash
   # Edit docker-compose.test.yml: DB_DRIVER=libsql
   docker-compose -f docker-compose.test.yml up
   ```

The database file is compatible between both drivers.

## Troubleshooting

### Issue: Package not found
**Solution:** Run `pnpm install` in project root first

### Issue: Database errors
**Solution:** Check DB_URL in docker-compose.test.yml matches file path

### Issue: Port already in use
**Solution:** Change port mapping in docker-compose.test.yml

### Issue: Login fails after password reset
**Solution:** Ensure the container is rebuilt with latest changes. Session creation requires timestamp format (fixed in migration).


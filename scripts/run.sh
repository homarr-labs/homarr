# Run migrations
node ./db/migrate.mjs ./db/migrations

# Start Redis
redis-server &

# Run the nestjs backend
node apps/nestjs/dist/main.mjs &

# Run the nextjs server
node apps/nextjs/server.js
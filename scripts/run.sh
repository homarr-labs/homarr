# Run migrations
node ./db/migrate.mjs ./db/migrations

# Start Redis
redis-server &

# Run the tasks backend
node apps/tasks/tasks.cjs &

# Run the nextjs server
node apps/nextjs/server.js
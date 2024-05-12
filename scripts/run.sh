# Run migrations
node ./db/migrations/$DB_DIALECT/migrate.cjs ./db/migrations/$DB_DIALECT

# Start Redis
redis-server /app/redis.conf &

# Run the tasks backend
node apps/tasks/tasks.cjs &

node apps/websocket/wssServer.cjs &

# Run the nextjs server
node apps/nextjs/server.js
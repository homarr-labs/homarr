# Run migrations
node ./db/migrate.cjs ./db/migrations/sqlite

# Start Redis
redis-server &

# Run the tasks backend
node apps/tasks/tasks.cjs &

node apps/websocket/wssServer.cjs &

# Run the nextjs server
node apps/nextjs/server.js
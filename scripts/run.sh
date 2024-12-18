# Run migrations
if [ $DB_MIGRATIONS_DISABLED = "true" ]; then
  echo "DB migrations are disabled, skipping"
else
    echo "Running DB migrations"
    node ./db/migrations/$DB_DIALECT/migrate.cjs ./db/migrations/$DB_DIALECT
fi

# Generates an encryption key if it doesn't exist and saves it to /secrets/encryptionKey
# Also sets the ENCRYPTION_KEY environment variable
encryptionKey=""
if [ -r /secrets/encryptionKey ]; then
    echo "Encryption key already exists"
    encryptionKey=$(cat /secrets/encryptionKey)
else
    echo "Generating encryption key"
    encryptionKey=$(node ./generateRandomSecureKey.js)
    echo $encryptionKey > /secrets/encryptionKey
fi
export ENCRYPTION_KEY=$encryptionKey

# Generates an auth secret if it doesn't exist and saves it to /secrets/authSecret
# Also sets the AUTH_SECRET environment variable required for auth.js
authSecret=""
if [ -r /secrets/authSecret ]; then
    echo "Auth secret already exists"
    authSecret=$(cat /secrets/authSecret)
else
    echo "Generating auth secret"
    authSecret=$(node ./generateRandomSecureKey.js)
    echo $authSecret > /secrets/authSecret
fi
export AUTH_SECRET=$authSecret

# Start nginx proxy
# 1. Replace the HOSTNAME in the nginx template file
# 2. Create the nginx configuration file from the template
# 3. Start the nginx server
envsubst '${HOSTNAME}' < /etc/nginx/templates/nginx.conf > /etc/nginx/nginx.conf
nginx -g 'daemon off;' &

# Start Redis
redis-server /app/redis.conf &

# Run the tasks backend
node apps/tasks/tasks.cjs &

node apps/websocket/wssServer.cjs &

# Run the nextjs server
node apps/nextjs/server.js & PID=$!

wait $PID

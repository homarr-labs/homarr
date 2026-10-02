// Server packages validate their environment during module initialization.
// Keep deterministic, non-secret values here so focused Node suites collect
// without requiring a developer's local .env file.
process.env.DB_DRIVER ??= "bun-sqlite";
process.env.DB_URL ??= ":memory:";
process.env.SECRET_ENCRYPTION_KEY ??= "0".repeat(64);

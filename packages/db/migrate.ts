import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const migrationsFolder = process.argv[2] ?? "./migrations/sqlite";

const sqlite = new Database(process.env.DB_URL?.replace("file:", ""));

const db = drizzle(sqlite);

migrate(db, { migrationsFolder });

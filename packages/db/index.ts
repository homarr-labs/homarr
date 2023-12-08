import Database from 'better-sqlite3';
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as sqliteSchema from "./schema/sqlite";


export const schema = sqliteSchema;

export * from "drizzle-orm";

const sqlite = new Database(process.env.DB_URL!);

export const db = drizzle(sqlite, { schema });

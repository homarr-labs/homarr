import fs from "fs";
import path from "path";

const migrationsFolderCandidates = [
  path.join(process.cwd(), "db/migrations/sqlite"),
  path.join(process.cwd(), "packages/db/migrations/sqlite"),
  path.resolve(process.cwd(), "../../db/migrations/sqlite"),
  "/app/db/migrations/sqlite",
];

export const findMigrationsFolder = () => migrationsFolderCandidates.find((candidate) => fs.existsSync(candidate));

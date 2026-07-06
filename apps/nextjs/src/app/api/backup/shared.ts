import fs from "fs";
import path from "path";

export const findMigrationsFolder = () => {
  const cwd = process.cwd();
  const migrationsFolderCandidates = [
    path.join(cwd, "db/migrations/sqlite"),
    path.join(cwd, "packages/db/migrations/sqlite"),
    path.resolve(cwd, "../../db/migrations/sqlite"),
    "/app/db/migrations/sqlite",
  ];
  return migrationsFolderCandidates.find((candidate) => fs.existsSync(candidate));
};

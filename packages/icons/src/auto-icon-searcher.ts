import type { IconReadScope } from "./resources";
import type { StoredIcon } from "./sync";

export const getIconForName = async (scope: IconReadScope, name: string): Promise<StoredIcon | undefined> => {
  const parameter = scope.dialect === "postgresql" ? "$1" : "?";
  const rows = await scope.queryAsync({
    sql: `SELECT i."id", i."name", i."url", i."checksum", i."icon_repository_id" FROM "icon" i INNER JOIN "iconRepository" r ON r."id" = i."icon_repository_id" WHERE i."name" LIKE ${parameter} AND (r."slug" <> 'local' OR EXISTS (SELECT 1 FROM "media" m WHERE i."url" = '/api/user-medias/' || m."id")) LIMIT 1`,
    parameters: [`%${name}%`],
  });
  const row = rows[0];
  if (!row) return undefined;
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.url !== "string" ||
    typeof row.checksum !== "string" ||
    typeof row.icon_repository_id !== "string"
  )
    throw new Error("Invalid automatic icon projection");
  return { id: row.id, name: row.name, url: row.url, checksum: row.checksum, iconRepositoryId: row.icon_repository_id };
};

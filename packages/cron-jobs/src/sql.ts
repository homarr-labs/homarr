import type { JobConfiguration, JobConfigurationStore } from "@homarr/cron-jobs-core/runtime";
import type { AnalyticsSettings, AnalyticsSnapshotRows, IconSyncPlan, StoredIcon } from "./jobs/runtime-bodies";
import type { HomarrJobName } from "./runtime";

export type JobSqlValue = string | number | boolean | null;

export interface JobSqlStatement {
  sql: string;
  parameters: readonly JobSqlValue[];
}

export interface JobsSqlPort {
  dialect: "sqlite" | "postgresql";
  queryAsync(statement: JobSqlStatement): Promise<readonly Record<string, unknown>[]>;
  querySnapshotAsync(statements: readonly JobSqlStatement[]): Promise<readonly (readonly Record<string, unknown>[])[]>;
  executeTransactionAsync(statements: readonly JobSqlStatement[]): Promise<readonly { affectedRows: number }[]>;
}

export interface JobsSettingsCodec {
  decode(value: string): Record<string, unknown>;
  encode(value: Record<string, unknown>): string;
  defaults: {
    analytics: AnalyticsSettings;
    board: { forceDisableStatus: boolean };
    culture: { defaultLocale: string };
  };
}

const readString = (value: unknown, field: string) => {
  if (typeof value !== "string") throw new Error(`Invalid SQL ${field}`);
  return value;
};

const readCount = (value: unknown) => {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(number) || number < 0) throw new Error("Invalid SQL count");
  return number;
};

const readBoolean = (value: unknown) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  throw new Error("Invalid SQL boolean");
};

const isJobName = (name: string): name is HomarrJobName =>
  name === "analytics" || name === "iconsUpdater" || name === "ping";

const createJobSqlHelpers = (port: Pick<JobsSqlPort, "dialect" | "queryAsync">) => {
  const parameter = (index: number) => (port.dialect === "postgresql" ? `$${index}` : "?");
  const boolean = (value: boolean) => (port.dialect === "postgresql" ? value : Number(value));
  const query = (sql: string, parameters: readonly JobSqlValue[] = []) => port.queryAsync({ sql, parameters });

  return { parameter, boolean, query };
};

export const createJobConfigurationSqlStore = (
  port: Pick<JobsSqlPort, "dialect" | "queryAsync">,
): JobConfigurationStore<HomarrJobName> => {
  const { parameter, boolean, query } = createJobSqlHelpers(port);

  const decodeConfiguration = (row: Record<string, unknown>): JobConfiguration<HomarrJobName> | null => {
    const name = readString(row.name, "job name");
    if (!isJobName(name)) return null;
    return {
      name,
      cronExpression: readString(row.cron_expression, "cron expression"),
      isEnabled: readBoolean(row.is_enabled),
    };
  };

  const configuration: JobConfigurationStore<HomarrJobName> = {
    async getAllAsync() {
      const rows = await query('SELECT "name", "cron_expression", "is_enabled" FROM "cron_job_configuration"');
      return rows.map(decodeConfiguration).filter((row) => row !== null);
    },
    async updateAsync(name, patch, defaults) {
      const updates: string[] = [];
      if (patch.cronExpression !== undefined) updates.push('"cron_expression" = excluded."cron_expression"');
      if (patch.isEnabled !== undefined) updates.push('"is_enabled" = excluded."is_enabled"');
      if (updates.length === 0) throw new Error("No cron job configuration changes");
      const rows = await query(
        `INSERT INTO "cron_job_configuration" ("name", "cron_expression", "is_enabled") VALUES (${parameter(1)}, ${parameter(2)}, ${parameter(3)}) ON CONFLICT ("name") DO UPDATE SET ${updates.join(", ")} RETURNING "name", "cron_expression", "is_enabled"`,
        [name, patch.cronExpression ?? defaults.cronExpression, boolean(patch.isEnabled ?? defaults.isEnabled)],
      );
      const row = rows[0];
      if (!row) throw new Error("Cron job configuration was not persisted");
      const value = decodeConfiguration(row);
      if (!value) throw new Error("Unknown persisted cron job");
      return value;
    },
  };

  return configuration;
};

export const createJobsSqlResources = (port: JobsSqlPort, codec: JobsSettingsCodec) => {
  const { parameter, boolean, query } = createJobSqlHelpers(port);
  const configuration = createJobConfigurationSqlStore(port);

  const readSettingsRowAsync = async (key: string) => {
    const rows = await query(`SELECT "value" FROM "serverSetting" WHERE "setting_key" = ${parameter(1)}`, [key]);
    const row = rows[0];
    return row ? readString(row.value, "server setting") : null;
  };

  const readSettingsAsync = async (key: keyof JobsSettingsCodec["defaults"]): Promise<Record<string, unknown>> => {
    const value = await readSettingsRowAsync(key);
    return { ...codec.defaults[key], ...(value === null ? {} : codec.decode(value)) };
  };

  const readAnalyticsSettings = (value: Record<string, unknown>): AnalyticsSettings => ({
    enableGeneral: readBoolean(value.enableGeneral),
    instanceId: value.instanceId === null ? null : readString(value.instanceId, "analytics instance ID"),
    lastSuccessfulSnapshotAt:
      value.lastSuccessfulSnapshotAt === null
        ? null
        : readString(value.lastSuccessfulSnapshotAt, "analytics timestamp"),
  });

  const analytics = {
    async readSettingsAsync() {
      return readAnalyticsSettings(await readSettingsAsync("analytics"));
    },
    async updateSettingsAsync(update: (current: AnalyticsSettings) => AnalyticsSettings) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const value = await readSettingsRowAsync("analytics");
        if (value === null) throw new Error("Analytics server settings are missing");
        const original = { ...codec.defaults.analytics, ...codec.decode(value) };
        const next = { ...original, ...update(readAnalyticsSettings(original)) };
        const rows = await query(
          `UPDATE "serverSetting" SET "value" = ${parameter(1)} WHERE "setting_key" = ${parameter(2)} AND "value" = ${parameter(3)} RETURNING "setting_key"`,
          [codec.encode(next), "analytics", value],
        );
        if (rows.length > 0) return readAnalyticsSettings(next);
      }
      throw new Error("Analytics server settings changed too often to update");
    },
    async collectSnapshotAsync(): Promise<AnalyticsSnapshotRows> {
      const counts = (table: string, filter?: { column: string; value: boolean }): JobSqlStatement => ({
        sql: `SELECT count(*) AS "count" FROM "${table}"${filter ? ` WHERE "${filter.column}" = ${parameter(1)}` : ""}`,
        parameters: filter ? [boolean(filter.value)] : [],
      });
      const grouped = (rows: readonly Record<string, unknown>[]) =>
        rows.map((row) => ({
          kind: readString(row.kind, "analytics kind"),
          count: readCount(row.count),
        }));
      const [
        cultureRows = [],
        boardRows = [],
        countBoards = [],
        countPublicBoards = [],
        countBoardsWithStatusEnabled = [],
        countGroups = [],
        countApps = [],
        countSections = [],
        countSearchEngines = [],
        countIconRepositories = [],
        countIcons = [],
        countLayouts = [],
        countItemLayouts = [],
        countSectionLayouts = [],
        countCronJobConfigs = [],
        countCustomWidgets = [],
        countTrustedCertificates = [],
        countUsers = [],
        countApiKeys = [],
        countInvites = [],
        countMedias = [],
        countSessions = [],
        countAccounts = [],
        integrationKinds = [],
        widgetKinds = [],
        boardsWithWidgetKinds = [],
        boardsWithIntegrationKinds = [],
        layoutRoleCounts = [],
        sectionKindCounts = [],
        boardCounts = [],
      ] = await port.querySnapshotAsync([
        { sql: `SELECT "value" FROM "serverSetting" WHERE "setting_key" = ${parameter(1)}`, parameters: ["culture"] },
        { sql: `SELECT "value" FROM "serverSetting" WHERE "setting_key" = ${parameter(1)}`, parameters: ["board"] },
        counts("board"),
        counts("board", { column: "is_public", value: true }),
        counts("board", { column: "disable_status", value: false }),
        counts("group"),
        counts("app"),
        counts("section"),
        counts("search_engine"),
        counts("iconRepository"),
        counts("icon"),
        counts("layout"),
        counts("item_layout"),
        counts("section_layout"),
        counts("cron_job_configuration"),
        counts("custom_widget_v2_definition"),
        counts("trusted_certificate_hostname"),
        counts("user"),
        counts("apiKey"),
        counts("invite"),
        counts("media"),
        counts("session"),
        counts("account"),
        { sql: 'SELECT "kind", count("id") AS "count" FROM "integration" GROUP BY "kind"', parameters: [] },
        { sql: 'SELECT "kind", count("id") AS "count" FROM "item" GROUP BY "kind"', parameters: [] },
        { sql: 'SELECT "kind", count(DISTINCT "board_id") AS "count" FROM "item" GROUP BY "kind"', parameters: [] },
        {
          sql: 'SELECT "integration"."kind" AS "kind", count(DISTINCT "item"."board_id") AS "count" FROM "integration_item" INNER JOIN "integration" ON "integration_item"."integration_id" = "integration"."id" INNER JOIN "item" ON "integration_item"."item_id" = "item"."id" GROUP BY "integration"."kind"',
          parameters: [],
        },
        { sql: 'SELECT "role" AS "kind", count("id") AS "count" FROM "layout" GROUP BY "role"', parameters: [] },
        { sql: 'SELECT "kind", count("id") AS "count" FROM "section" GROUP BY "kind"', parameters: [] },
        { sql: 'SELECT "board_id", count("id") AS "count" FROM "item" GROUP BY "board_id"', parameters: [] },
      ]);
      const cultureRow = cultureRows[0];
      const culture = {
        ...codec.defaults.culture,
        ...(cultureRow ? codec.decode(readString(cultureRow.value, "server setting")) : {}),
      };
      const boardRow = boardRows[0];
      const board = {
        ...codec.defaults.board,
        ...(boardRow ? codec.decode(readString(boardRow.value, "server setting")) : {}),
      };
      return {
        cultureSettings: { defaultLocale: readString(culture.defaultLocale, "default locale") },
        boardSettings: { forceDisableStatus: readBoolean(board.forceDisableStatus) },
        counts: {
          countBoards: readCount(countBoards[0]?.count),
          countPublicBoards: readCount(countPublicBoards[0]?.count),
          countBoardsWithStatusEnabled: readCount(countBoardsWithStatusEnabled[0]?.count),
          countGroups: readCount(countGroups[0]?.count),
          countApps: readCount(countApps[0]?.count),
          countSections: readCount(countSections[0]?.count),
          countSearchEngines: readCount(countSearchEngines[0]?.count),
          countIconRepositories: readCount(countIconRepositories[0]?.count),
          countIcons: readCount(countIcons[0]?.count),
          countLayouts: readCount(countLayouts[0]?.count),
          countItemLayouts: readCount(countItemLayouts[0]?.count),
          countSectionLayouts: readCount(countSectionLayouts[0]?.count),
          countCronJobConfigs: readCount(countCronJobConfigs[0]?.count),
          countCustomWidgets: readCount(countCustomWidgets[0]?.count),
          countTrustedCertificates: readCount(countTrustedCertificates[0]?.count),
          countUsers: readCount(countUsers[0]?.count),
          countApiKeys: readCount(countApiKeys[0]?.count),
          countInvites: readCount(countInvites[0]?.count),
          countMedias: readCount(countMedias[0]?.count),
          countSessions: readCount(countSessions[0]?.count),
          countAccounts: readCount(countAccounts[0]?.count),
        },
        integrationKinds: grouped(integrationKinds),
        widgetKinds: grouped(widgetKinds),
        boardsWithWidgetKinds: grouped(boardsWithWidgetKinds),
        boardsWithIntegrationKinds: grouped(boardsWithIntegrationKinds),
        layoutRoleCounts: grouped(layoutRoleCounts),
        sectionKindCounts: grouped(sectionKindCounts),
        boardItemCounts: boardCounts.map((row) => ({
          boardId: readString(row.board_id, "board ID"),
          count: readCount(row.count),
        })),
      };
    },
  };

  const icons = {
    async readRepositoriesAsync() {
      const [repositories = [], iconRows = []] = await port.querySnapshotAsync([
        { sql: 'SELECT "id", "slug" FROM "iconRepository"', parameters: [] },
        { sql: 'SELECT "id", "checksum", "name", "url", "icon_repository_id" FROM "icon"', parameters: [] },
      ]);
      const parsed: StoredIcon[] = iconRows.map((row) => ({
        id: readString(row.id, "icon ID"),
        checksum: readString(row.checksum, "icon checksum"),
        name: readString(row.name, "icon name"),
        url: readString(row.url, "icon URL"),
        iconRepositoryId: readString(row.icon_repository_id, "icon repository ID"),
      }));
      return repositories.map((row) => {
        const id = readString(row.id, "repository ID");
        return {
          id,
          slug: readString(row.slug, "repository slug"),
          icons: parsed.filter((icon) => icon.iconRepositoryId === id),
        };
      });
    },
    async applySyncAsync(plan: IconSyncPlan) {
      const statements: JobSqlStatement[] = [];
      const deleteParameters: JobSqlValue[] = [];
      let condition = "";
      if (plan.deleteIcons.kind === "repositories") {
        condition =
          " WHERE " +
          plan.deleteIcons.repositories
            .map((repository) => {
              deleteParameters.push(repository.id);
              const idParameter = parameter(deleteParameters.length);
              const checksums = repository.retainedChecksums.map((checksum) => {
                deleteParameters.push(checksum);
                return parameter(deleteParameters.length);
              });
              return `("icon_repository_id" = ${idParameter}${checksums.length > 0 ? ` AND "checksum" NOT IN (${checksums.join(", ")})` : ""})`;
            })
            .join(" OR ");
      }
      statements.push({ sql: `DELETE FROM "icon"${condition}`, parameters: deleteParameters });
      if (plan.deleteRepositoryIds.length > 0) {
        statements.push({
          sql: `DELETE FROM "iconRepository" WHERE "id" IN (${plan.deleteRepositoryIds.map((_, index) => parameter(index + 1)).join(", ")})`,
          parameters: plan.deleteRepositoryIds,
        });
      }
      if (plan.insertRepositories.length > 0) {
        statements.push({
          sql: `INSERT INTO "iconRepository" ("id", "slug") VALUES ${plan.insertRepositories.map((_, index) => `(${parameter(index * 2 + 1)}, ${parameter(index * 2 + 2)})`).join(", ")}`,
          parameters: plan.insertRepositories.flatMap((row) => [row.id, row.slug]),
        });
      }
      for (const batch of plan.insertIconBatches) {
        if (batch.length === 0) continue;
        statements.push({
          sql: `INSERT INTO "icon" ("id", "checksum", "name", "url", "icon_repository_id") VALUES ${batch.map((icon, index) => `(${[icon.id, icon.checksum, icon.name, icon.url, icon.iconRepositoryId].map((value, column) => parameter(index * 5 + column + 1)).join(", ")})`).join(", ")}`,
          parameters: batch.flatMap((row) => [row.id, row.checksum, row.name, row.url, row.iconRepositoryId]),
        });
      }
      const results = await port.executeTransactionAsync(statements);
      const first = results[0];
      if (!first) throw new Error("Icon transaction did not return deletion count");
      return { deletedIcons: first.affectedRows };
    },
  };

  return {
    configuration,
    analytics,
    icons,
    async readBoardSettingsAsync() {
      const settings = await readSettingsAsync("board");
      return { forceDisableStatus: readBoolean(settings.forceDisableStatus) };
    },
    async deleteSessionsForProvidersAsync(providers: readonly string[]) {
      if (providers.length === 0) return 0;
      const rows = await query(
        `DELETE FROM "session" WHERE "user_id" IN (SELECT "id" FROM "user" WHERE "provider" IN (${providers.map((_, index) => parameter(index + 1)).join(", ")})) RETURNING "user_id"`,
        providers,
      );
      return rows.length;
    },
  };
};

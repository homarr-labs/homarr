import type { createId } from "@homarr/common";
import type { decryptSecret, encryptSecret } from "@homarr/common/server";
import type * as operators from "@homarr/db";
import type { getServerSettingByKeyAsync } from "@homarr/db/queries";
import type * as schema from "@homarr/db/schema";
import type { z } from "zod/v4";

import type { verifyAssistantGenerationAccessToken } from "../../../assistant-generation-access";
import type { fetchOpenRouterGenerationTelemetryAsync } from "../../../assistant-generation-telemetry";
import type { AuthenticatedBackendContext } from "../../context";
import type { assistantModelSchema } from "./helpers";

export type AssistantConfiguration = typeof schema.assistantConfigurations.$inferSelect;
export type AssistantModel = z.infer<typeof assistantModelSchema>;

export interface AssistantProcedureResources {
  readonly tables: Pick<
    typeof schema,
    | "apps"
    | "assistantConfigurations"
    | "assistantMessages"
    | "assistantThreads"
    | "boards"
    | "boardGroupPermissions"
    | "boardUserPermissions"
    | "groupMembers"
    | "groups"
    | "integrationGroupPermissions"
    | "integrations"
    | "integrationUserPermissions"
    | "items"
    | "users"
  >;
  readonly operators: Pick<
    typeof operators,
    "and" | "asc" | "desc" | "eq" | "inArray" | "isNull" | "not" | "or" | "handleTransactionsAsync"
  >;
  readonly crypto: {
    readonly encryptSecret: typeof encryptSecret;
    readonly decryptSecret: typeof decryptSecret;
    readonly verifyAssistantGenerationAccessToken: typeof verifyAssistantGenerationAccessToken;
  };
  readonly transport: {
    readonly fetch: typeof globalThis.fetch;
    readonly fetchOpenRouterGenerationTelemetryAsync: typeof fetchOpenRouterGenerationTelemetryAsync;
  };
  readonly runtime: {
    readonly workshopApiUrl: string | undefined;
    readonly homarrWebsiteUrl: string | undefined;
  };
  readonly authority: {
    assertCurrentAsync(context: AuthenticatedBackendContext, access: "protected" | "admin"): Promise<void>;
  };
  readonly modelListCache: Map<string, { expiresAt: number; value: AssistantModel[] }>;
  readonly getServerSettingByKeyAsync: typeof getServerSettingByKeyAsync;
  readonly createId: typeof createId;
}

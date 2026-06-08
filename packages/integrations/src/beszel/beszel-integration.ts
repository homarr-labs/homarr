import type { fetch as undiciFetch } from "undici";
import z from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { ResponseError } from "@homarr/common/server";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemUsageIntegration } from "../interfaces/system-usage/system-usage-integration";
import type { AgentConnectionType, System, SystemLoadStatus } from "../interfaces/system-usage/system-usage-types";

@HandleIntegrationErrors([])
export class BeszelIntegration extends Integration implements ISystemUsageIntegration {
  protected async testingAsync({ fetchAsync }: IntegrationTestingInput): Promise<TestingResult> {
    await this.authenticateAsync(fetchAsync);
    return { success: true as const };
  }

  public async getSystemsAsync() {
    const token = await this.authenticateAsync();
    const response = await this.fetchApi("/api/collections/systems/records?perPage=500", token);
    const data = z.object({ items: z.array(systemSchema) }).parse(response);
    return data.items.map((system) => ({
      id: system.id,
      name: system.name,
    }));
  }

  public async getSystemDetailsAsync(id: string): Promise<System> {
    const token = await this.authenticateAsync();
    const response = await this.fetchApi(`/api/collections/systems/records/${id}`, token);
    const system = systemSchema.parse(response);

    return {
      id: system.id,
      name: system.name,
      status: system.status,
      agent: {
        connectionType: system.info.ct !== undefined ? (connectionTypeByCode[system.info.ct] ?? null) : null,
        version: system.info.v,
      },
      usage: {
        cpuPercentage: system.info.cpu,
        memoryPercentage: system.info.mp,
        diskPercentage: system.info.dp,
        gpuPercentage: system.info.g ?? null,
        load: {
          status: this.calculateLoadStatus(system.status, system.info.la, system.info.t),
          averages: {
            one: system.info.la[0],
            five: system.info.la[1],
            fifteen: system.info.la[2],
          },
        },
        networkBytes: system.info.bb,
        temperature: system.info.dt ?? null,
      },
    };
  }

  private calculateLoadStatus(
    systemStatus: BeszelSystem["status"],
    loadAverages: [number, number, number],
    threatCount: number | undefined,
  ): SystemLoadStatus {
    if (systemStatus !== "up") return "unknown";

    const maxLoad = Math.max(...loadAverages);
    const loadPerThread = maxLoad / (threatCount ?? 1);
    const meter = loadPerThread * 100;
    if (meter >= 90) return "critical";
    if (meter >= 65) return "warning";
    return "good";
  }

  private async fetchApi(
    path: string,
    token: string,
    customFetch: typeof undiciFetch = fetchWithTrustedCertificatesAsync,
  ) {
    const response = await customFetch(this.url(path).toString(), {
      headers: { Authorization: token },
    });
    if (!response.ok) {
      throw new ResponseError(response);
    }
    return await response.json();
  }

  private async authenticateAsync(customFetch: typeof undiciFetch = fetchWithTrustedCertificatesAsync) {
    const response = await customFetch(this.url("/api/collections/users/auth-with-password").toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
      }),
    });
    if (!response.ok) {
      // PocketBase returns 400 for failed auth — remap to 401 for proper authorization error classification
      const status = response.status === 400 ? 401 : response.status;
      throw new ResponseError({ status, url: response.url });
    }
    const data = authResponseSchema.parse(await response.json());
    return data.token;
  }
}

const connectionTypeByCode: Record<number, AgentConnectionType> = {
  1: "ssh",
  2: "webSocket",
};

const authResponseSchema = z.object({
  token: z.string(),
});

const systemStatus = ["up", "down", "paused", "pending"] as const;

/**
 * See https://github.com/henrygd/beszel/blob/cca7b360395e3e7e4ef870005efddc3bd75b86c4/internal/entities/system/system.go#L104
 */
const systemSchema = z.object({
  id: z.string(),
  info: z.object({
    cpu: z.number(),
    mp: z.number(),
    dp: z.number(),
    g: z.number().optional(),
    la: z.tuple([z.number(), z.number(), z.number()]),
    bb: z.number(),
    dt: z.number().optional(),
    v: z.string(),
    ct: z.number().optional(),
    t: z.number().optional(),
  }),
  name: z.string(),
  status: z.enum(systemStatus),
});

type BeszelSystem = z.infer<typeof systemSchema>;

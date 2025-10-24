import PocketBase from "pocketbase";
import z from "zod";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationPocketBaseHttpErrorHandler } from "../base/errors/http";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemUsageIntegration } from "../interfaces/system-usage/system-usage-integration";
import type { System, SystemLoadStatus } from "../interfaces/system-usage/system-usage-types";

@HandleIntegrationErrors([integrationPocketBaseHttpErrorHandler])
export class BeszelIntegration extends Integration implements ISystemUsageIntegration {
  protected async testingAsync(): Promise<TestingResult> {
    const client = this.createClient();
    return await this.authenticateAsync(client).then(() => ({ success: true as const }));
  }
  public async getSystemsAsync() {
    const client = this.createClient();
    await this.authenticateAsync(client);

    const records = await client.collection("systems").getFullList();
    const systems = z.array(systemSchema).parse(records);
    return systems.map((system) => ({
      id: system.id,
      name: system.name,
    }));
  }

  public async getSystemDetailsAsync(id: string): Promise<System> {
    const client = this.createClient();
    await this.authenticateAsync(client);

    const record = await client.collection("systems").getOne(id);
    const system = systemSchema.parse(record);

    return {
      id: system.id,
      name: system.name,
      status: system.status,
      agent: {
        connectionType: system.info.ct === 1 ? "ssh" : system.info.ct === 2 ? "webSocket" : null,
        version: system.info.v,
      },
      usage: {
        cpuPercentage: system.info.cpu,
        memoryPercentage: system.info.mp,
        diskPercentage: system.info.dp,
        gpuPercentage: system.info.g ?? null,
        load: {
          status: this.calculateLoadStatus(system.status, system.info.la, system.info.t), // TODO: handle correctly with user settings maybe?
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

  private createClient() {
    return new PocketBase(this.url("/").toString());
  }

  private async authenticateAsync(client: PocketBase) {
    return await client
      .collection("users")
      .authWithPassword(this.getSecretValue("username"), this.getSecretValue("password"));
  }
}

const systemStatus = ["up", "down", "paused", "pending"] as const;

/**
 * See https://github.com/henrygd/beszel/blob/cca7b360395e3e7e4ef870005efddc3bd75b86c4/internal/entities/system/system.go#L104
 */
const systemSchema = z.object({
  id: z.string(),
  info: z.object({
    cpu: z.number(), // cpu usage in %
    mp: z.number(), // memory usage in %
    dp: z.number(), // disk usage in %
    g: z.number().optional(), // gpu usage in %
    la: z.tuple([z.number(), z.number(), z.number()]), // load average for last 1, 5 and 15 minutes
    bb: z.number(), // network usage in bytes
    dt: z.number().optional(), // dashboard temperature
    v: z.string(), // agent version
    ct: z.number().optional(), // connection type of agent
    t: z.number().optional(), // amount of threads
  }),
  name: z.string(),
  status: z.enum(systemStatus),
});

type BeszelSystem = z.infer<typeof systemSchema>;

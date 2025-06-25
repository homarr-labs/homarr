import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { ParseError, ResponseError } from "@homarr/common/server";
import { createChannelEventHistory } from "@homarr/redis";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { FirewallSummaryIntegration } from "../interfaces/firewall-summary/firewall-summary-integration";
import type {
  FirewallCpuSummary,
  FirewallInterface,
  FirewallInterfacesSummary,
  FirewallMemorySummary,
  FirewallVersionSummary,
} from "../interfaces/firewall-summary/firewall-summary-types";
import {
  opnsenseCPUSchema,
  opnsenseInterfacesSchema,
  opnsenseMemorySchema,
  opnsenseSystemSummarySchema,
} from "./opnsense-types";

@HandleIntegrationErrors([])
export class OPNsenseIntegration extends Integration implements FirewallSummaryIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/diagnostics/system/system_information"), {
      headers: {
        Authorization: this.getAuthHeaders(),
      },
    });
    if (!response.ok) return TestConnectionError.StatusResult(response);

    const result = await response.json();
    if (typeof result === "object" && result !== null) return { success: true };

    return TestConnectionError.ParseResult(new ParseError("Expected object data"));
  }

  private getAuthHeaders() {
    const username = super.getSecretValue("username");
    const password = super.getSecretValue("password");
    return `Basic ${btoa(`${username}:${password}`)}`;
  }

  public async getFirewallVersionAsync(): Promise<FirewallVersionSummary> {
    const responseSummary = await fetchWithTrustedCertificatesAsync(
      this.url("/api/diagnostics/system/system_information"),
      {
        headers: {
          Authorization: this.getAuthHeaders(),
        },
      },
    );
    if (!responseSummary.ok) {
      throw new ResponseError(responseSummary);
    }
    const summary = opnsenseSystemSummarySchema.safeParse(await responseSummary.json());
    if (!summary.success) {
      throw new Error(
        `Failed to parse version for ${this.integration.name} (${this.integration.id}):\n${summary.error.message}`,
      );
    }
    return {
      version: summary.data.versions.at(0) ?? "Unknown",
    };
  }

  private getInterfacesChannel() {
    return createChannelEventHistory<FirewallInterface[]>(`integration:${this.integration.id}:interfaces`, 15);
  }

  public async getFirewallInterfacesAsync(): Promise<FirewallInterfacesSummary[]> {
    const channel = this.getInterfacesChannel();

    const interfaceSummary = await fetchWithTrustedCertificatesAsync(this.url("/api/diagnostics/traffic/interface"), {
      headers: {
        Authorization: this.getAuthHeaders(),
      },
    });

    if (!interfaceSummary.ok) {
      throw new ResponseError(interfaceSummary);
    }
    const test_value = await interfaceSummary.json();
    const interfaces = opnsenseInterfacesSchema.safeParse(test_value);
    if (!interfaces.success) {
      throw new Error(
        `Failed to parse interfaces for ${this.integration.name} (${this.integration.id}):\n${interfaces.error.message}`,
      );
    }
    const returnValue: FirewallInterface[] = [];
    const interfaceKeys = Object.keys(interfaces.data.interfaces);

    for (const key of interfaceKeys) {
      const inter = interfaces.data.interfaces[key];
      if (!inter) continue; 

      const name = inter.name;
      const nameValue = typeof name === "string" ? name : "unknown";
      const bytesTransmitted = inter["bytes transmitted"];
      const bytesReceived = inter["bytes received"];
      const receiveValue = typeof bytesReceived === "string" ? parseInt(bytesReceived, 10) : 0;
      const transmitValue = typeof bytesTransmitted === "string" ? parseInt(bytesTransmitted, 10) : 0;

      returnValue.push({
        name: nameValue,
        receive: receiveValue,
        transmit: transmitValue,
      });
    }

    await channel.pushAsync(returnValue);

    return await channel.getSliceAsync(0, 1);
  }

  public async getFirewallMemoryAsync(): Promise<FirewallMemorySummary> {
    const responseMemory = await fetchWithTrustedCertificatesAsync(
      this.url("/api/diagnostics/system/systemResources"),
      {
        headers: {
          Authorization: this.getAuthHeaders(),
        },
      },
    );
    if (!responseMemory.ok) {
      throw new ResponseError(responseMemory);
    }

    const memory = opnsenseMemorySchema.safeParse(await responseMemory.json());
    if (!memory.success) {
      throw new Error(
        `Failed to parse memory summary for ${this.integration.name} (${this.integration.id}):\n${memory.error.message}`,
      );
    }
    // Using parseInt for memoryTotal is normal, the api sends the total memory as a string
    const memoryTotal = parseInt(memory.data.memory.total);
    const memoryUsed = memory.data.memory.used;
    const memoryPercent = (100 * memoryUsed) / memoryTotal;
    return {
      total: memoryTotal,
      used: memoryUsed,
      percent: memoryPercent,
    };
  }

  public async getFirewallCpuAsync(): Promise<FirewallCpuSummary> {
    const cpuSummary = await fetchWithTrustedCertificatesAsync(this.url("/api/diagnostics/cpu_usage/stream"), {
      headers: {
        Authorization: this.getAuthHeaders(),
      },
    });

    if (!cpuSummary.ok) {
      throw new Error(`HTTP error! status: ${cpuSummary.status}`);
    }

    if (!cpuSummary.body) {
      throw new Error("ReadableStream not supported in this environment.");
    }

    const reader = cpuSummary.body.getReader();
    const decoder = new TextDecoder();
    const loop = true
    try {
      while (loop) {
        const result = await reader.read();
        if (result.done) {
          break;
        }
        if (!(result.value instanceof Uint8Array)) {
          throw new Error("Received value is not an Uint8Array.");
        }

        const value: AllowSharedBufferSource = result.value;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data:")) {
            continue;
          }
          const data = line.substring(5).trim();
          const cpu_values = opnsenseCPUSchema.safeParse(JSON.parse(data));

          if (!cpu_values.success) {
            throw new Error(
              `Failed to parse cpu summary for ${this.integration.name} (${this.integration.id}):\n${cpu_values.error.message}`,
            );
          }

          return {
            ...cpu_values.data,
          };
        }
      }

      throw new Error("No valid CPU data found.");
    } finally {
      await reader.cancel();
    }
  }
}

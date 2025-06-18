import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { ParseError } from "@homarr/common/server";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationAxiosHttpErrorHandler } from "../base/errors/http";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { FirewallSummaryIntegration } from "../interfaces/firewall-summary/firewall-summary-integration";
import type {
  FirewallCpuSummary,
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

@HandleIntegrationErrors([integrationAxiosHttpErrorHandler])
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
    return "Basic " + btoa(`${username}:${password}`);
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
      throw new Error(
        `Failed to fetch version for ${this.integration.name} (${this.integration.id}): ${responseSummary.statusText}`,
      );
    }
    const summary = opnsenseSystemSummarySchema.safeParse(await responseSummary.json());
    if (!summary.success) {
      throw new Error(
        `Failed to parse version for ${this.integration.name} (${this.integration.id}):\n${summary.error.message}`,
      );
    }
    const firewallVersion: FirewallVersionSummary = {
      version: typeof summary.data.versions[0] === "string" ? summary.data.versions[0] : "Unknown",
    };
    return firewallVersion;
  }

  public async getFirewallInterfacesAsync(): Promise<FirewallInterfacesSummary> {
    const interfaceSummary = await fetchWithTrustedCertificatesAsync(this.url("/api/diagnostics/traffic/interface"), {
      headers: {
        Authorization: this.getAuthHeaders(),
      },
    });

    if (!interfaceSummary.ok) {
      throw new Error(
        `Failed to fetch interfaces for ${this.integration.name} (${this.integration.id}): ${interfaceSummary.statusText}`,
      );
    }
    const test_value = await interfaceSummary.json();
    const interfaces = opnsenseInterfacesSchema.safeParse(test_value);
    if (!interfaces.success) {
      throw new Error(
        `Failed to parse interfaces for ${this.integration.name} (${this.integration.id}):\n${interfaces.error.message}`,
      );
    }
    const returnValue: FirewallInterfacesSummary[] = [];
    const interfaceKeys = Object.keys(interfaces.data.interfaces);

    interfaceKeys.forEach((key) => {
      const inter = interfaces.data.interfaces[key];
      const name = inter.name;

      const nameValue = typeof name === "string" ? name : "unknown";
      const bytesTransmitted = inter["bytes transmitted"];
      const bytesReceived = inter["bytes received"];
      const recvValue = typeof bytesReceived === "string" ? parseInt(bytesReceived, 10) : 0;
      const transValue = typeof bytesTransmitted === "string" ? parseInt(bytesTransmitted, 10) : 0;

      returnValue.push({
        name: nameValue,
        recv: recvValue,
        trans: transValue,
      });
    });

    return returnValue;
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
      throw new Error(
        `Failed to fetch memory for ${this.integration.name} (${this.integration.id}): ${responseMemory.statusText}`,
      );
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
    const memoryPercent = (100 * memory.data.memory.used) / parseInt(memory.data.memory.total);
    const memorySummary: FirewallMemorySummary = {
      total: memoryTotal,
      used: memoryUsed,
      percent: memoryPercent,
    };

    return memorySummary;
  }

  public async getFirewallCpuAsync(): Promise<FirewallCpuSummary> {
    // The API endpoint for OPNsense is SSE compliant. But I'll just get one event and close the connection
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

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data:")) {
          const data = line.substring(5).trim();

          const cpu_values = opnsenseCPUSchema.safeParse(JSON.parse(data));
          if (!cpu_values.success) {
            throw new Error(
              `Failed to parse cpu summary for ${this.integration.name} (${this.integration.id}):\n${cpu_values.error.message}`,
            );
          }
          await reader.cancel();
          const returnValue: FirewallCpuSummary = {
            ...cpu_values.data,
          };
          return returnValue;
        }
      }
    }
  }
}

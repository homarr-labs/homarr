import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { ParseError } from "@homarr/common/server";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationAxiosHttpErrorHandler } from "../base/errors/http";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { FirewallSummaryIntegration } from "../interfaces/firewall-summary/firewall-summary-integration";
import type { FirewallInterfaceSummary, FirewallMemorySummary, FirewallVersionSummary, FirewallCpuSummary } from "../interfaces/firewall-summary/firewall-summary-types";
import {
  opnsenseActivitySchema,
  opnsenseInterfacesSchema,
  opnsenseMemorySchema,
  opnsenseMemorySummary,
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

  private async getCpuValuesAsync() {
    const responseActivity = await fetchWithTrustedCertificatesAsync(
      this.url("/api/diagnostics/activity/getActivity"),
      {
        headers: {
          Authorization: this.getAuthHeaders(),
        },
      },
    );

    if (!responseActivity.ok) {
      throw new Error(
        `Failed to fetch CPU values for ${this.integration.name} (${this.integration.id}): ${responseActivity.statusText}`,
      );
    }
    const activity = opnsenseActivitySchema.safeParse(await responseActivity.json());
    if (!activity.success) {
      throw new Error(
        `Failed to parse cpu values for ${this.integration.name} (${this.integration.id}):\n${activity.error.message}`,
      );
    }

    const rawCpuValues = String(activity.data.headers[2]);

    const regexRes = / ([0-9.]+)% idle/.exec(rawCpuValues);
    if (regexRes?.[1]) {
      return 100 - parseInt(regexRes[1], 10);
    }
    return -1;
  }

  private async getMemoryValuesAsync() {
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
      memory: {
        total: memoryTotal,
        used: memoryUsed,
        percent: memoryPercent,
      }
    };

    return memorySummary;
  }

  private async getVersionAsync() {
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
    return summary.data.versions[0];
  }

  private async getInterfacesAsync() {
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
    const returnValue: FirewallInterfaceSummary[] = [];
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


  public async getFirewallVersionAsync(): Promise<FirewallVersionSummary> {
    const version = await this.getVersionAsync();
    return {
      version,
    }
  }

  public async getFirewallInterfacesAsync(): Promise<FirewallInterfaceSummary> {
    const interfaces = await this.getInterfacesAsync();
    return {
      interfaces,
    }
  }

  public async getFirewallMemoryAsync(): Promise<FirewallMemorySummary> {
    const memory = await this.getMemoryAsync();
    return {
      memory,
    }
  }

  public getFirewallCpu(): FirewallCpuSummary {

    // The API endpoint for OPNsense is SSE compliant. But I'll just get one event and close the connection
    const response = await fetch('/api/diagnostics/cpu_usage/stream', {
      headers: {
        Authorization: this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported in this environment.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.substring(5).trim();
          console.log(`Received data: ${data}`);

          await reader.cancel();
          return;
        }
      }
    }
  }
}


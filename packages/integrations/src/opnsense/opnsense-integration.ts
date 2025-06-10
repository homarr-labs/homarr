import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import { integrationAxiosHttpErrorHandler } from "../base/errors/http";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { FirewallSummaryIntegration } from "../interfaces/firewall-summary/firewall-summary-integration";
import type { FirewallSummary, FirewallInterfaceSummary } from "../interfaces/firewall-summary/firewall-summary-types";
import { opnsenseActivitySchema, opnsenseInterfacesSchema, opnsenseMemorySchema, opnsenseMemorySummary, opnsenseSystemSummarySchema } from "./opnsense-types";
import { ParseError } from "@homarr/common/server";


@HandleIntegrationErrors([integrationAxiosHttpErrorHandler])
export class OPNsenseIntegration extends Integration implements FirewallSummaryIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/diagnostics/system/system_information"),{
        headers: {
          Authorization: this.getAuthHeaders(),
        }
      });
    if (!response.ok) return TestConnectionError.StatusResult(response);

    const result = await response.json();
    if (typeof result === "object" && result !== null) return { success: true };

    return TestConnectionError.ParseResult(new ParseError("Expected object data"));
  }

  private getAuthHeaders() {
      const username = super.getSecretValue("username");
      const password = super.getSecretValue("password");
      return 'Basic ' + btoa(`${username}:${password}`);
    }

  private async getCpuValuesAsync() {
    const responseActivity = await fetchWithTrustedCertificatesAsync(this.url("/api/diagnostics/activity/getActivity"), {
      headers: {
        Authorization: this.getAuthHeaders(),
      }
    });

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
      return parseInt(regexRes[1], 10);
    }
    return -1;
  }

  private async getMemoryValuesAsync() {
    const responseMemory = await fetchWithTrustedCertificatesAsync(this.url("/api/diagnostics/system/systemResources"), {
      headers: {
        Authorization: this.getAuthHeaders(),
      }
    });
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

    const memoryTotal = parseInt(memory.data.memory.total);
    const memoryUsed = memory.data.memory.used;

    const memorySummary: opnsenseMemorySummary = {
      total: memoryTotal,
      used: memoryUsed,
    };

    return memorySummary;
  }
  private async getVersionAsync() {
    const responseSummary = await fetchWithTrustedCertificatesAsync(this.url("/api/diagnostics/system/system_information"), {
      headers: {
        Authorization: this.getAuthHeaders(),
      }
    });
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
      }
    });

    if (!interfaceSummary.ok) {
      throw new Error(
        `Failed to fetch interfaces for ${this.integration.name} (${this.integration.id}): ${interfaceSummary.statusText}`,
      );
    }

    const interfaces = opnsenseInterfacesSchema.safeParse(await interfaceSummary.json());
    if (!interfaces.success) {
      throw new Error(
        `Failed to parse interfaces for ${this.integration.name} (${this.integration.id}):\n${interfaces.error.message}`,
      );
    }

    const returnValue: FirewallInterfaceSummary[] = [];

    if (Array.isArray(interfaces.data.interfaces)) {
      interfaces.data.interfaces.forEach((inter) => {

        const name = inter["name"];

        const nameValue = typeof name === 'string' ? name : 'unknown';
        const bytesTransmitted = inter["bytes transmitted"];
        const bytesReceived = inter["bytes received"];
        const recvValue = typeof bytesReceived === 'string' ? parseInt(bytesReceived, 10) : 0;
        const transValue = typeof bytesTransmitted === 'string' ? parseInt(bytesTransmitted, 10) : 0;

        returnValue.push({
          name: nameValue,
          recv: recvValue,
          trans: transValue,
        });
      })
    }
    return returnValue
  }

  public async getFirewallSummaryAsync(): Promise<FirewallSummary> {
    const version = await this.getVersionAsync()
    const memory_values = await this.getMemoryValuesAsync()
    const cpu_values = await this.getCpuValuesAsync()
    const interfaces = await this.getInterfacesAsync()

    return {
      version: typeof version === 'string' ? version : 'unknown',
      memory: memory_values,
      cpu: {
        idle: cpu_values,
      },
      interfaces: interfaces,
    }
  }
}
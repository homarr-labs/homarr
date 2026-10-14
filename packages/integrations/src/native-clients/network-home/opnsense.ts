import { ResponseError } from "@homarr/common/response-error";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type {
  FirewallCpuSummary,
  FirewallInterface,
  FirewallInterfacesSummary,
  FirewallMemorySummary,
  FirewallVersionSummary,
} from "../../interfaces/firewall-summary/firewall-summary-types";
import {
  opnsenseCPUSchema,
  opnsenseInterfacesSchema,
  opnsenseMemorySchema,
  opnsenseSystemSummarySchema,
} from "../../opnsense/opnsense-types";
import { NetworkHomeCapabilityHeldError, NetworkHomeProtocol } from "./transport";
import type { NetworkHomeHttpOperation } from "./transport";

export class OPNsenseProtocol extends NetworkHomeProtocol {
  async getFirewallVersionAsync(): Promise<FirewallVersionSummary> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/diagnostics/system/system_information"),
        { headers: this.authHeaders() },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          const summary = opnsenseSystemSummarySchema.parse(await response.json());
          return { version: summary.versions.at(0) ?? "Unknown" };
        },
      ),
    );
  }

  async getFirewallMemoryAsync(): Promise<FirewallMemorySummary> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/diagnostics/system/system_resources"),
        { headers: this.authHeaders() },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          const memory = opnsenseMemorySchema.parse(await response.json());
          const total = parseInt(memory.memory.total);
          return { total, used: memory.memory.used, percent: (100 * memory.memory.used) / total };
        },
      ),
    );
  }

  async getFirewallInterfacesAsync(): Promise<FirewallInterfacesSummary[]> {
    this.requireInterfaceHistory();
    await this.readInterfacesCandidateAsync();
    throw new NetworkHomeCapabilityHeldError("interface-history");
  }

  async getFirewallCpuAsync(): Promise<FirewallCpuSummary> {
    this.requireCpuStream();
    return this.readCpuCandidateAsync();
  }

  protected async testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult> {
    return http.responseAsync(
      this.url("/api/diagnostics/system/system_information"),
      { headers: this.authHeaders() },
      async (response) => {
        if (!response.ok) return TestConnectionError.StatusResult(response);
        const data = await response.json();
        if (typeof data === "object" && data !== null) return { success: true };
        throw new NetworkHomeCapabilityHeldError("parse-error-constructor");
      },
    );
  }

  private requireInterfaceHistory(): void {
    throw new NetworkHomeCapabilityHeldError("interface-history");
  }

  private requireCpuStream(): void {
    throw new NetworkHomeCapabilityHeldError("cpu-stream");
  }

  private readInterfacesCandidateAsync(): Promise<FirewallInterface[]> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/diagnostics/traffic/interface"),
        { headers: this.authHeaders() },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          const interfaces = opnsenseInterfacesSchema.parse(await response.json());
          return Object.values(interfaces.interfaces).map((entry) => ({
            name: entry.name,
            receive: parseInt(entry["bytes received"], 10),
            transmit: parseInt(entry["bytes transmitted"], 10),
          }));
        },
      ),
    );
  }

  private readCpuCandidateAsync(): Promise<FirewallCpuSummary> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/diagnostics/cpu_usage/stream"),
        { headers: this.authHeaders() },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          if (!response.body) throw new Error("ReadableStream not supported in this environment.");
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let loopCounter = 0;
          try {
            while (loopCounter < 10) {
              this.resources.context.signal.throwIfAborted();
              loopCounter++;
              const result = await reader.read();
              if (result.done) break;
              const value: unknown = result.value;
              if (!(value instanceof Uint8Array)) throw new Error("Received value is not an Uint8Array.");
              for (const line of decoder.decode(value, { stream: true }).split("\n")) {
                if (!line.startsWith("data:") || loopCounter < 2) continue;
                return { ...opnsenseCPUSchema.parse(JSON.parse(line.substring(5).trim())) };
              }
            }
            throw new Error("No valid CPU data found.");
          } finally {
            try {
              await reader.cancel();
            } finally {
              reader.releaseLock();
            }
          }
        },
      ),
    );
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Basic ${btoa(`${this.secret("opnsenseApiKey")}:${this.secret("opnsenseApiSecret")}`)}` };
  }
}

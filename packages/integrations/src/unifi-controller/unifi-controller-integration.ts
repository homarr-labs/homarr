import type { SiteStats } from "node-unifi";
import { Controller } from "node-unifi";

import { logger } from "@homarr/log";

import { Integration } from "../base/integration";
import type { NetworkControllerSummaryIntegration } from "../interfaces/network-controller-summary/network-controller-summary-integration";
import type { NetworkControllerSummary } from "../interfaces/network-controller-summary/network-controller-summary-types";
import type { HealthSubsystem } from "./unifi-controller-types";

export class UnifiControllerIntegration extends Integration implements NetworkControllerSummaryIntegration {
  public async getNetworkSummaryAsync(): Promise<NetworkControllerSummary> {
    const client = await this.createControllerClientAsync();
    const stats = await client.getSitesStats();

    logger.warn("Found stats: " + JSON.stringify(stats, null, 2));

    return {
      wanStatus: this.getStatusValueOverAllSites(stats, "wan", (site) => site.status === "ok"),
      www: {
        status: this.getStatusValueOverAllSites(stats, "wan", (site) => site.status === "ok"),
        latency: this.getNumericValueOverAllSites(stats, "www", (site) => site.latency, "max"),
        ping: this.getNumericValueOverAllSites(stats, "www", (site) => site.speedtest_ping, "max"),
        uptime: this.getNumericValueOverAllSites(stats, "www", (site) => site.uptime, "max"),
      },
      wifi: {
        status: this.getStatusValueOverAllSites(stats, "wlan", (site) => site.status === "ok"),
        users: this.getNumericValueOverAllSites(stats, "wlan", (site) => site.num_user, "sum"),
        guests: this.getNumericValueOverAllSites(stats, "wlan", (site) => site.num_guest, "sum"),
      },
      lan: {
        status: this.getStatusValueOverAllSites(stats, "lan", (site) => site.status === "ok"),
        users: this.getNumericValueOverAllSites(stats, "lan", (site) => site.num_user, "sum"),
        guests: this.getNumericValueOverAllSites(stats, "lan", (site) => site.num_guest, "sum"),
      },
      vpn: {
        status: this.getStatusValueOverAllSites(stats, "vpn", (site) => site.status === "ok"),
        users: this.getNumericValueOverAllSites(stats, "vpn", (site) => site.remote_user_num_active, "sum"),
      },
    } satisfies NetworkControllerSummary;
  }

  public async testConnectionAsync(): Promise<void> {
    const client = await this.createControllerClientAsync();
    await client.getSitesStats();
  }

  private async createControllerClientAsync() {
    const portString = new URL(this.integration.url).port;
    const port = Number.isInteger(portString) ? Number(portString) : undefined;
    const hostname = new URL(this.integration.url).hostname;
    const url = port === undefined ? `https://${hostname}/` : `https://${hostname}:${port}/`;

    logger.warn(`Constructed URL: ${url}`);

    const client = new Controller({
      host: hostname,
      // @ts-expect-error the URL construction is incorrect and does not append the required / at the end: https://github.com/jens-maus/node-unifi/blob/05665e8f82a900a15a9ea8b1071750b29825b3bc/unifi.js#L56, https://github.com/jens-maus/node-unifi/blob/05665e8f82a900a15a9ea8b1071750b29825b3bc/unifi.js#L95
      port: port === undefined ? "/" : `${port}/`,
      sslverify: false, // TODO: implement a "ignore certificate toggle", see https://github.com/homarr-labs/homarr/issues/2553
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
    });

    // Object.defineProperty(client, '_baseurl', { value: url });
    await client.login(this.getSecretValue("username"), this.getSecretValue("password"), null);
    return client;
  }

  private getStatusValueOverAllSites<S extends HealthSubsystem>(
    data: SiteStats[],
    subsystem: S,
    selectCallback: (obj: SiteStats["health"][number]) => boolean,
  ) {
    return this.getBooleanValueOverAllSites(data, subsystem, selectCallback) ? "enabled" : "disabled";
  }

  private getNumericValueOverAllSites<
    S extends HealthSubsystem,
    T extends Extract<SiteStats["health"][number], { subsystem: S }>,
  >(data: SiteStats[], subsystem: S, selectCallback: (obj: T) => number, strategy: "average" | "sum" | "max"): number {
    const values = data.map((site) => selectCallback(this.getSubsystem(site.health, subsystem) as T));

    if (strategy === "sum") {
      return values.reduce((first, second) => first + second, 0);
    }

    if (strategy === "average") {
      return values.reduce((first, second, _, array) => first + second / array.length, 0);
    }

    return Math.max(...values);
  }

  private getBooleanValueOverAllSites(
    data: SiteStats[],
    subsystem: HealthSubsystem,
    selectCallback: (obj: SiteStats["health"][number]) => boolean,
  ): boolean {
    return data.every((site) => selectCallback(this.getSubsystem(site.health, subsystem)));
  }

  private getSubsystem(health: SiteStats["health"], subsystem: HealthSubsystem) {
    const value = health.find((health) => health.subsystem === subsystem);
    if (!value) {
      throw new Error(`Subsystem ${subsystem} not found!`);
    }
    return value;
  }
}

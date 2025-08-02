import "@homarr/redis";
import type {IntegrationTestingInput} from "../base/integration";
import {Integration} from "../base/integration";
import type {TestingResult} from "../base/test-connection/test-connection-service";
import type {ISystemHealthMonitoringIntegration} from "../interfaces/health-monitoring/health-monitoring-integration";
import type {SystemHealthMonitoring} from "../interfaces/health-monitoring/health-monitoring-types";
import {logger} from "@homarr/log";

const localLogger = logger.child({ module: "TrueNasIntegration" });

export class TrueNasIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  private webSocket: WebSocket | null = null;
  private subscriptionId = 0;

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    await this.connectWebSocketAsync();
    await this.authenticateWebSocketAsync();
    return { success: true };
  }

  private async connectWebSocketAsync() {
    const wsUrl = this.integration.url.replace('http', 'ws');
    this.webSocket = new WebSocket(`${wsUrl}/websocket`);

    return new Promise((resolve, reject) => {
      if (!this.webSocket) return reject(new Error('WebSocket not initialized'));

      this.webSocket.onmessage = (event) => {
        localLogger.warn(`WebSocket message received: ${event.data}, ${JSON.stringify(event)}`);
      };

      this.webSocket.onopen = () => {
        localLogger.warn(`WebSocket connection (1) to ${wsUrl} opened`);
        resolve(true);
      };

      this.webSocket.onerror = () => {
        reject(new Error('Failed to connect'));
      }
    })
  }

  private async authenticateWebSocketAsync() {
    if (!this.webSocket) return;
  }

  private subscribeToStats() {
    if (!this.webSocket) return;

    const subscriptions = [
      {name: 'reporting.get_data', args: ['cpu'], id: String(++this.subscriptionId)},
      {name: 'reporting.get_data', args: ['memory'], id: String(++this.subscriptionId)},
      {name: 'reporting.get_data', args: ['network'], id: String(++this.subscriptionId)},
    ];

    subscriptions.forEach(sub => {
      this.webSocket?.send(JSON.stringify({
        id: sub.id,
        msg: 'method',
        method: sub.name,
        params: sub.args
      }));
    });
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    await this.connectWebSocketAsync();

    return {};
  }
}
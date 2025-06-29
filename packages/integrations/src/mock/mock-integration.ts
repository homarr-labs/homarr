import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { CalendarIntegration } from "../interfaces/calendar/calendar-integration";
import type { DnsHoleSummaryIntegration } from "../interfaces/dns-hole-summary/dns-hole-summary-integration";
import type { IDownloadClientIntegration } from "../interfaces/downloads/download-client-integration";
import type {
  IClusterHealthMonitoringIntegration,
  ISystemHealthMonitoringIntegration,
} from "../interfaces/health-monitoring/health-monitoring-integration";
import type { IIndexerManagerIntegration } from "../interfaces/indexer-manager/indexer-manager-integration";
import { CalendarMockService } from "./data/calendar";
import { ClusterHealthMonitoringMockService } from "./data/cluster-health-monitoring";
import { DnsHoleMockService } from "./data/dns-hole";
import { DownloadClientMockService } from "./data/download";
import { IndexerManagerMockService } from "./data/indexer-manager";
import { SystemHealthMonitoringMockService } from "./data/system-health-monitoring";

export class MockIntegration
  extends Integration
  implements
    DnsHoleSummaryIntegration,
    CalendarIntegration,
    IDownloadClientIntegration,
    IClusterHealthMonitoringIntegration,
    ISystemHealthMonitoringIntegration,
    IIndexerManagerIntegration
{
  private static readonly dnsHole = new DnsHoleMockService();
  private static readonly calendar = new CalendarMockService();
  private static readonly downloadClient = new DownloadClientMockService();
  private static readonly clusterMonitoring = new ClusterHealthMonitoringMockService();
  private static readonly systemMonitoring = new SystemHealthMonitoringMockService();
  private static readonly indexerManager = new IndexerManagerMockService();

  protected async testingAsync(_: IntegrationTestingInput): Promise<TestingResult> {
    return await Promise.resolve({
      success: true,
    });
  }

  // CalendarIntegration
  getCalendarEventsAsync = MockIntegration.calendar.getCalendarEventsAsync.bind(MockIntegration.calendar);

  // DnsHoleSummaryIntegration
  getSummaryAsync = MockIntegration.dnsHole.getSummaryAsync.bind(MockIntegration.dnsHole);
  enableAsync = MockIntegration.dnsHole.enableAsync.bind(MockIntegration.dnsHole);
  disableAsync = MockIntegration.dnsHole.disableAsync.bind(MockIntegration.dnsHole);

  // IDownloadClientIntegration
  getClientJobsAndStatusAsync = MockIntegration.downloadClient.getClientJobsAndStatusAsync.bind(
    MockIntegration.downloadClient,
  );
  pauseQueueAsync = MockIntegration.downloadClient.pauseQueueAsync.bind(MockIntegration.downloadClient);
  pauseItemAsync = MockIntegration.downloadClient.pauseItemAsync.bind(MockIntegration.downloadClient);
  resumeQueueAsync = MockIntegration.downloadClient.resumeQueueAsync.bind(MockIntegration.downloadClient);
  resumeItemAsync = MockIntegration.downloadClient.resumeItemAsync.bind(MockIntegration.downloadClient);
  deleteItemAsync = MockIntegration.downloadClient.deleteItemAsync.bind(MockIntegration.downloadClient);

  // Health Monitoring Integrations
  getSystemInfoAsync = MockIntegration.systemMonitoring.getSystemInfoAsync.bind(MockIntegration.systemMonitoring);
  getClusterInfoAsync = MockIntegration.clusterMonitoring.getClusterInfoAsync.bind(MockIntegration.downloadClient);

  // IndexerManagerIntegration
  getIndexersAsync = MockIntegration.indexerManager.getIndexersAsync.bind(MockIntegration.indexerManager);
  testAllAsync = MockIntegration.indexerManager.testAllAsync.bind(MockIntegration.indexerManager);
}

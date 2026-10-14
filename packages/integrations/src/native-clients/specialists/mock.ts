import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { MockIntegration } from "../../mock/mock-integration";
import { SpecialistBranchHeldError, SpecialistProtocol } from "./protocol";

const heldSyntheticSource = (): never => {
  throw new SpecialistBranchHeldError("mock-source-fixture-lifetime-ownership");
};

export class MockProtocol extends SpecialistProtocol {
  protected async testingAsync(_input: IntegrationTestingInput): Promise<TestingResult> {
    return { success: true };
  }

  getCalendarEventsAsync: MockIntegration["getCalendarEventsAsync"] = heldSyntheticSource;
  getSummaryAsync: MockIntegration["getSummaryAsync"] = heldSyntheticSource;
  enableAsync: MockIntegration["enableAsync"] = heldSyntheticSource;
  disableAsync: MockIntegration["disableAsync"] = heldSyntheticSource;
  getClientJobsAndStatusAsync: MockIntegration["getClientJobsAndStatusAsync"] = heldSyntheticSource;
  pauseQueueAsync: MockIntegration["pauseQueueAsync"] = heldSyntheticSource;
  pauseItemAsync: MockIntegration["pauseItemAsync"] = heldSyntheticSource;
  resumeQueueAsync: MockIntegration["resumeQueueAsync"] = heldSyntheticSource;
  resumeItemAsync: MockIntegration["resumeItemAsync"] = heldSyntheticSource;
  deleteItemAsync: MockIntegration["deleteItemAsync"] = heldSyntheticSource;
  getSystemInfoAsync: MockIntegration["getSystemInfoAsync"] = heldSyntheticSource;
  getClusterInfoAsync: MockIntegration["getClusterInfoAsync"] = heldSyntheticSource;
  getIndexersAsync: MockIntegration["getIndexersAsync"] = heldSyntheticSource;
  testAllAsync: MockIntegration["testAllAsync"] = heldSyntheticSource;
  getMissingAsync: MockIntegration["getMissingAsync"] = heldSyntheticSource;
  getMediaQueueAsync: MockIntegration["getMediaQueueAsync"] = heldSyntheticSource;
  getMediaReleasesAsync: MockIntegration["getMediaReleasesAsync"] = heldSyntheticSource;
  getSeriesInformationAsync: MockIntegration["getSeriesInformationAsync"] = heldSyntheticSource;
  requestMediaAsync: MockIntegration["requestMediaAsync"] = heldSyntheticSource;
  getRequestsAsync: MockIntegration["getRequestsAsync"] = heldSyntheticSource;
  getStatsAsync: MockIntegration["getStatsAsync"] = heldSyntheticSource;
  getUsersAsync: MockIntegration["getUsersAsync"] = heldSyntheticSource;
  approveRequestAsync: MockIntegration["approveRequestAsync"] = heldSyntheticSource;
  declineRequestAsync: MockIntegration["declineRequestAsync"] = heldSyntheticSource;
  getCurrentSessionsAsync: MockIntegration["getCurrentSessionsAsync"] = heldSyntheticSource;
  getStatisticsAsync: MockIntegration["getStatisticsAsync"] = heldSyntheticSource;
  getWorkersAsync: MockIntegration["getWorkersAsync"] = heldSyntheticSource;
  getQueueAsync: MockIntegration["getQueueAsync"] = heldSyntheticSource;
  getNetworkSummaryAsync: MockIntegration["getNetworkSummaryAsync"] = heldSyntheticSource;
  getNotificationsAsync: MockIntegration["getNotificationsAsync"] = heldSyntheticSource;
  getEntityStateAsync: MockIntegration["getEntityStateAsync"] = heldSyntheticSource;
  triggerAutomationAsync: MockIntegration["triggerAutomationAsync"] = heldSyntheticSource;
  triggerToggleAsync: MockIntegration["triggerToggleAsync"] = heldSyntheticSource;
  getUpsSummariesAsync: MockIntegration["getUpsSummariesAsync"] = heldSyntheticSource;
  getSystemsAsync: MockIntegration["getSystemsAsync"] = heldSyntheticSource;
  getSystemDetailsAsync: MockIntegration["getSystemDetailsAsync"] = heldSyntheticSource;
  getSystemStatsAsync: MockIntegration["getSystemStatsAsync"] = heldSyntheticSource;
  getContainerStatsAsync: MockIntegration["getContainerStatsAsync"] = heldSyntheticSource;
  getAlertsAsync: MockIntegration["getAlertsAsync"] = heldSyntheticSource;
  getAlertHistoryAsync: MockIntegration["getAlertHistoryAsync"] = heldSyntheticSource;
  subscribeRealtimeMetrics: MockIntegration["subscribeRealtimeMetrics"] = heldSyntheticSource;
}

export const mockSyntheticScalarStats = () => ({ documents: 1234, songs: 5678, storage: 12345678900 });

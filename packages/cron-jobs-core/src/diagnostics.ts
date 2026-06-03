const bytesToMiB = (bytes: number) => Number((bytes / (1024 * 1024)).toFixed(2));

const getActiveHandlesCount = () => {
  const processWithHandles = process as NodeJS.Process & {
    _getActiveHandles?: () => unknown[];
  };
  return processWithHandles._getActiveHandles?.().length ?? null;
};

const getActiveRequestsCount = () => {
  const processWithRequests = process as NodeJS.Process & {
    _getActiveRequests?: () => unknown[];
  };
  return processWithRequests._getActiveRequests?.().length ?? null;
};

export interface ProcessDiagnosticsSnapshot {
  rssMiB: number;
  heapUsedMiB: number;
  heapTotalMiB: number;
  externalMiB: number;
  arrayBuffersMiB: number;
  uptimeSeconds: number;
  userCpuMicros: number;
  systemCpuMicros: number;
  maxRssKiB: number;
  activeHandles: number | null;
  activeRequests: number | null;
}

export const createProcessDiagnosticsSnapshot = (): ProcessDiagnosticsSnapshot => {
  const memory = process.memoryUsage();
  const resources = process.resourceUsage();

  return {
    rssMiB: bytesToMiB(memory.rss),
    heapUsedMiB: bytesToMiB(memory.heapUsed),
    heapTotalMiB: bytesToMiB(memory.heapTotal),
    externalMiB: bytesToMiB(memory.external),
    arrayBuffersMiB: bytesToMiB(memory.arrayBuffers),
    uptimeSeconds: Number(process.uptime().toFixed(0)),
    userCpuMicros: resources.userCPUTime,
    systemCpuMicros: resources.systemCPUTime,
    maxRssKiB: resources.maxRSS,
    activeHandles: getActiveHandlesCount(),
    activeRequests: getActiveRequestsCount(),
  };
};

export const createProcessDiagnosticsDelta = (
  before: ProcessDiagnosticsSnapshot,
  after: ProcessDiagnosticsSnapshot,
) => {
  return {
    rssMiB: Number((after.rssMiB - before.rssMiB).toFixed(2)),
    heapUsedMiB: Number((after.heapUsedMiB - before.heapUsedMiB).toFixed(2)),
    heapTotalMiB: Number((after.heapTotalMiB - before.heapTotalMiB).toFixed(2)),
    externalMiB: Number((after.externalMiB - before.externalMiB).toFixed(2)),
    arrayBuffersMiB: Number((after.arrayBuffersMiB - before.arrayBuffersMiB).toFixed(2)),
    uptimeSeconds: Number((after.uptimeSeconds - before.uptimeSeconds).toFixed(0)),
    userCpuMicros: after.userCpuMicros - before.userCpuMicros,
    systemCpuMicros: after.systemCpuMicros - before.systemCpuMicros,
    maxRssKiB: after.maxRssKiB - before.maxRssKiB,
    activeHandles:
      before.activeHandles === null || after.activeHandles === null ? null : after.activeHandles - before.activeHandles,
    activeRequests:
      before.activeRequests === null || after.activeRequests === null
        ? null
        : after.activeRequests - before.activeRequests,
  };
};

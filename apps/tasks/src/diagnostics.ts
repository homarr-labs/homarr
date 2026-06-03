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

export const getTasksRuntimeDiagnostics = () => {
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

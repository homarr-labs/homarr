import type { JobStatusRecord } from "../runtime";

export const jobStatusRecordKey = (name: string) => `runtime-job-status:record:v1:${name}`;

export const jobStatusNotificationName = (name: string) => `cron-job-status:${name}`;

export const decodeJobStatusRecord = (name: string, serialized: string | null): JobStatusRecord | null => {
  if (serialized === null) return null;
  const record: unknown = JSON.parse(serialized);
  if (
    typeof record !== "object" ||
    record === null ||
    !("revision" in record) ||
    typeof record.revision !== "number" ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 0 ||
    !("ownerId" in record) ||
    typeof record.ownerId !== "string" ||
    !("runId" in record) ||
    typeof record.runId !== "string" ||
    !("value" in record) ||
    typeof record.value !== "object" ||
    record.value === null ||
    !("name" in record.value) ||
    record.value.name !== name ||
    !("status" in record.value) ||
    (record.value.status !== "running" && record.value.status !== "idle") ||
    !("lastExecutionTimestamp" in record.value) ||
    typeof record.value.lastExecutionTimestamp !== "string" ||
    !("lastExecutionStatus" in record.value) ||
    (record.value.lastExecutionStatus !== null &&
      record.value.lastExecutionStatus !== "success" &&
      record.value.lastExecutionStatus !== "error")
  ) {
    throw new Error("Invalid retained cron job status record");
  }
  return Object.freeze({
    revision: record.revision,
    ownerId: record.ownerId,
    runId: record.runId,
    value: Object.freeze({
      name,
      status: record.value.status,
      lastExecutionTimestamp: record.value.lastExecutionTimestamp,
      lastExecutionStatus: record.value.lastExecutionStatus,
    }),
  });
};

export const encodeJobStatusRecord = (record: JobStatusRecord): string =>
  JSON.stringify({
    revision: record.revision,
    ownerId: record.ownerId,
    runId: record.runId,
    value: {
      name: record.value.name,
      status: record.value.status,
      lastExecutionTimestamp: record.value.lastExecutionTimestamp,
      lastExecutionStatus: record.value.lastExecutionStatus,
    },
  });

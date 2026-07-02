export const RUNNING_STATUS = "running";

export function getStatusColor(status: string) {
  return status === RUNNING_STATUS ? "green" : "red";
}

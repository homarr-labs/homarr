import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";

export const overview = {
  status: "degraded",
  checkedAt: "2026-10-25T00:00:00Z",
  summary: {
    services: 6,
    healthy: 5,
    degraded: 1,
    latencyMs: 184,
    openIncidents: 1,
    uptimePercent: 99.95,
    totalRequests: 183294,
    errorRate: 0.014,
  },
  services: [
    {
      id: "media",
      name: "Media library",
      status: "operational",
      latencyMs: 42,
      uptimePercent: 99.99,
      version: "10.11.0",
    },
    { id: "photos", name: "Family photos", status: "degraded", latencyMs: 331, uptimePercent: 98.75, version: "2.3.1" },
    { id: "dns", name: "Local DNS", status: "operational", latencyMs: 8, uptimePercent: 100, version: "0.107.0" },
    {
      id: "backup",
      name: "Offsite backup",
      status: "operational",
      latencyMs: 65,
      uptimePercent: 99.97,
      version: "1.6.0",
    },
    {
      id: "automation",
      name: "Home automation",
      status: "operational",
      latencyMs: 21,
      uptimePercent: 99.96,
      version: "2026.10",
    },
    { id: "proxy", name: "Reverse proxy", status: "operational", latencyMs: 4, uptimePercent: 99.99, version: "3.5.0" },
  ],
  incidents: [
    {
      id: "inc-1",
      title: "Photo indexing is delayed",
      severity: "warning",
      status: "investigating",
      startedAt: "2026-10-24T23:30:00Z",
      affectedServices: ["photos"],
    },
  ],
  capacity: {
    cpuPercent: 43.2,
    memoryUsedBytes: 12884901888,
    memoryTotalBytes: 34359738368,
    diskUsedBytes: 2199023255552,
    diskTotalBytes: 8796093022208,
    activeSessions: 17,
  },
  history: Array.from({ length: 12 }, (_, index) => ({
    hour: `${String(index * 2).padStart(2, "0")}:00`,
    requests: 8000 + index * 300,
    errors: [10, 12, 8, 4, 0, 3, 18, 21, 90, 64, 25, 14][index],
    latencyMs: [42, 44, 38, 35, 40, 42, 50, 70, 220, 210, 194, 184][index],
  })),
};

if (process.argv.includes("--serve")) {
  const server = createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/v1/overview") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(overview));
  });
  server.listen(3904, "127.0.0.1", () => console.log("Synthetic overview fixture at127.0.0.1:3904"));
} else {
  await writeFile(new URL("./response.json", import.meta.url), `${JSON.stringify(overview, null, 2)}\n`);
}

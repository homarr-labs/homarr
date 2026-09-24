export const fixtures = {
  wud: {
    username: "fixture-wud-user",
    password: "fixture-wud-password",
    containers: [
      {
        id: "container-1",
        name: "homeassistant",
        displayName: "Home Assistant",
        updateAvailable: true,
        image: { tag: { value: "2026.9.0" } },
        result: { tag: "2026.9.1" },
      },
      { id: "container-2", name: "traefik", updateAvailable: false },
    ],
  },
  unraid: {
    apiKey: "fixture-unraid-api-key",
    memory: {
      total: 32_000_000_000,
      available: 19_500_000_000,
      used: 12_500_000_000,
      free: 19_500_000_000,
      percentTotal: 39.0625,
    },
    system: {
      metrics: {
        cpu: { percentTotal: 12, cpus: [{ percentTotal: 12 }] },
        memory: {
          total: 32_000_000_000,
          available: 19_500_000_000,
          used: 12_500_000_000,
          free: 19_500_000_000,
          percentTotal: 39.0625,
        },
      },
      array: {
        state: "STARTED",
        capacity: { disks: { free: 500, total: 1000, used: 500 } },
        disks: [{ name: "disk1", size: 1000, fsFree: 500, fsUsed: 500, status: "DISK_OK", temp: 35 }],
      },
      info: {
        devices: { network: [{ speed: 1000, dhcp: false, model: "fixture-net" }] },
        os: { platform: "linux", distro: "Unraid", release: "7.3.2", uptime: "2026-09-18T00:00:00.000Z" },
        cpu: { manufacturer: "Fixture", brand: "Fixture CPU", cores: 1, threads: 2 },
      },
    },
  },
  immich: {
    apiKey: "fixture-immich-api-key",
    albums: [
      { id: "album-1", albumName: "Family", assetCount: 3 },
      { id: "album-2", albumName: "Trips", assetCount: 7 },
    ],
  },
  github: {
    repository: "fixture-owner/fixture-repository",
    releaseCount: 1001,
  },
  unifi: {
    username: "fixture-unifi-user",
    password: "fixture-unifi-password",
  },
  nextcloud: {
    calendars: [
      { id: "personal", events: ["event-1", "event-2"] },
      { id: "work", events: ["event-3", "event-4"] },
      { id: "family", events: ["event-5"] },
    ],
  },
};

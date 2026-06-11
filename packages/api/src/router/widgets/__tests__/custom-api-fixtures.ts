export const sonarrResponse = {
  wanted: { totalRecords: 42 },
  queue: { totalRecords: 5 },
  series: [
    { title: "Breaking Bad", seasons: 5, episodeCount: 62, episodeFileCount: 60 },
    { title: "The Wire", seasons: 5, episodeCount: 60, episodeFileCount: 55 },
  ],
  diskspace: [
    { path: "/tv", label: "TV Shows", freeSpace: 150_000_000_000, totalSpace: 500_000_000_000 },
    { path: "/movies", label: "Movies", freeSpace: 80_000_000_000, totalSpace: 250_000_000_000 },
  ],
};

export const sonarrStatGridConfig = {
  type: "statGrid" as const,
  items: [
    { label: "Missing", jsonPath: "$.wanted.totalRecords", unit: "", color: "red" },
    { label: "Queue", jsonPath: "$.queue.totalRecords", unit: "", color: "blue" },
  ],
  columns: 2,
  cardStyle: "filled" as const,
};

export const proxmoxResponse = {
  data: {
    cpu: 0.23,
    memory: { used: 12_884_901_888, total: 34_359_738_368 },
    rootfs: { used: 42_949_672_960, total: 107_374_182_400 },
    uptime: 864_000,
    status: "running",
    maxcpu: 8,
    maxmem: 34_359_738_368,
    name: "proxmox-node1",
  },
};

export const proxmoxProgressBarsConfig = {
  type: "progressBars" as const,
  bars: [
    { label: "Memory", valuePath: "$.data.memory.used", maxPath: "$.data.memory.total", unit: "B", color: "blue" },
    { label: "Disk", valuePath: "$.data.rootfs.used", maxPath: "$.data.rootfs.total", unit: "B", color: "orange" },
  ],
  showPercentage: true,
  barSize: "md" as const,
};

export const diskUsageResponse = {
  filesystems: [
    { filesystem: "/dev/sda1", size: "500G", used: "350G", avail: "150G", usePct: "70%", mountedOn: "/" },
    { filesystem: "/dev/sdb1", size: "2T", used: "1.2T", avail: "800G", usePct: "60%", mountedOn: "/data" },
    { filesystem: "/dev/sdc1", size: "4T", used: "3.8T", avail: "200G", usePct: "95%", mountedOn: "/media" },
  ],
};

export const diskTableConfig = {
  type: "table" as const,
  tablePath: "$.filesystems",
  columns: [
    { header: "Mount", jsonPath: "$.mountedOn" },
    { header: "Size", jsonPath: "$.size" },
    { header: "Used", jsonPath: "$.usePct" },
  ],
  striped: true,
  compact: false,
};

export const piholeResponse = {
  domains_being_blocked: 125_432,
  dns_queries_today: 48_291,
  ads_blocked_today: 12_847,
  ads_percentage_today: 26.6,
  unique_clients: 14,
  status: "enabled",
  gravity_last_updated: { relative: { days: 2, hours: 3 } },
};

export const piholeStatusIndicatorConfig = {
  type: "statusIndicator" as const,
  items: [{ label: "Pi-Hole", jsonPath: "$.status", goodValues: ["enabled"] }],
  layout: "list" as const,
  dotSize: "md" as const,
};

export const piholeCountGridConfig = {
  type: "countGrid" as const,
  items: [
    { label: "Blocked Today", jsonPath: "$.ads_blocked_today", unit: "" },
    { label: "DNS Queries", jsonPath: "$.dns_queries_today", unit: "" },
    { label: "Block Rate", jsonPath: "$.ads_percentage_today", unit: "%" },
    { label: "Clients", jsonPath: "$.unique_clients", unit: "" },
  ],
  columns: 2,
  valueSize: "md" as const,
};

export const radarrResponse = {
  wanted: { totalRecords: 15 },
  queue: { totalRecords: 3 },
  movie: [
    { title: "Inception", hasFile: true, monitored: true, runtime: 148, year: 2010 },
    { title: "Interstellar", hasFile: false, monitored: true, runtime: 169, year: 2014 },
    { title: "The Dark Knight", hasFile: true, monitored: false, runtime: 152, year: 2008 },
  ],
  rootfolder: [{ path: "/movies", freeSpace: 200_000_000_000, totalSpace: 1_000_000_000_000 }],
};

export const radarrStatGridConfig = {
  type: "statGrid" as const,
  items: [
    { label: "Missing", jsonPath: "$.wanted.totalRecords", unit: "", color: "red" },
    { label: "Queue", jsonPath: "$.queue.totalRecords", unit: "", color: "teal" },
  ],
  columns: 2,
  cardStyle: "outline" as const,
};

export const jellyfinItemCountsResponse = {
  MovieCount: 185,
  SeriesCount: 38,
  EpisodeCount: 770,
  ArtistCount: 0,
  ProgramCount: 0,
  TrailerCount: 0,
  SongCount: 0,
  AlbumCount: 0,
  MusicVideoCount: 0,
  BoxSetCount: 12,
  BookCount: 0,
  ItemCount: 0,
};

export const jellyfinCountGridConfig = {
  type: "countGrid" as const,
  items: [
    { label: "Movies", jsonPath: "$.MovieCount", unit: "" },
    { label: "Series", jsonPath: "$.SeriesCount", unit: "" },
    { label: "Episodes", jsonPath: "$.EpisodeCount", unit: "" },
    { label: "Songs", jsonPath: "$.SongCount", unit: "" },
  ],
  columns: 4,
  valueSize: "lg" as const,
};

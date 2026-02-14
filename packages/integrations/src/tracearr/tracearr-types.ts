export interface TracearrServerStatus {
  id: string;
  name: string;
  type: "plex" | "jellyfin" | "emby";
  online: boolean;
  activeStreams: number;
}

export interface TracearrHealthResponse {
  status: "ok";
  timestamp: string;
  servers: TracearrServerStatus[];
}

export interface TracearrStatsResponse {
  activeStreams: number;
  totalUsers: number;
  totalSessions: number;
  recentViolations: number;
  timestamp: string;
}

export interface TracearrSourceVideoDetails {
  bitrate?: number;
  framerate?: string;
  dynamicRange?: string;
  aspectRatio?: number;
  profile?: string;
  level?: string;
  colorSpace?: string;
  colorDepth?: number;
}

export interface TracearrSourceAudioDetails {
  bitrate?: number;
  channelLayout?: string;
  language?: string;
  sampleRate?: number;
}

export interface TracearrStreamVideoDetails {
  bitrate?: number;
  width?: number;
  height?: number;
  framerate?: string;
  dynamicRange?: string;
}

export interface TracearrStreamAudioDetails {
  bitrate?: number;
  channels?: number;
  language?: string;
}

export interface TracearrTranscodeInfo {
  containerDecision: "directplay" | "copy" | "transcode";
  sourceContainer?: string;
  streamContainer?: string;
  hwRequested?: boolean;
  hwDecoding?: string;
  hwEncoding?: string;
  speed?: number;
  throttled?: boolean;
  reasons?: string[];
}

export interface TracearrSubtitleInfo {
  decision?: string;
  codec?: string;
  language?: string;
  forced?: boolean;
}

export interface TracearrStream {
  id: string;
  serverId: string;
  serverName: string;
  username: string;
  userThumb: string | null;
  userAvatarUrl: string | null;
  mediaTitle: string;
  mediaType: "movie" | "episode" | "track" | "live" | "photo" | "unknown";
  showTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  year: number | null;
  thumbPath: string | null;
  posterUrl: string | null;
  durationMs: number | null;
  state: "playing" | "paused" | "stopped";
  progressMs: number;
  startedAt: string;
  isTranscode: boolean | null;
  videoDecision: "directplay" | "copy" | "transcode" | null;
  audioDecision: "directplay" | "copy" | "transcode" | null;
  bitrate: number | null;
  sourceVideoCodec: string | null;
  sourceAudioCodec: string | null;
  sourceAudioChannels: number | null;
  sourceVideoWidth: number | null;
  sourceVideoHeight: number | null;
  sourceVideoDetails: TracearrSourceVideoDetails | null;
  sourceAudioDetails: TracearrSourceAudioDetails | null;
  streamVideoCodec: string | null;
  streamAudioCodec: string | null;
  streamVideoDetails: TracearrStreamVideoDetails | null;
  streamAudioDetails: TracearrStreamAudioDetails | null;
  transcodeInfo: TracearrTranscodeInfo | null;
  subtitleInfo: TracearrSubtitleInfo | null;
  resolution: string | null;
  sourceVideoCodecDisplay: string | null;
  sourceAudioCodecDisplay: string | null;
  audioChannelsDisplay: string | null;
  streamVideoCodecDisplay: string | null;
  streamAudioCodecDisplay: string | null;
  device: string | null;
  player: string | null;
  product: string | null;
  platform: string | null;
}

export interface TracearrServerStreamSummary {
  serverId: string;
  serverName: string;
  total: number;
  transcodes: number;
  directStreams: number;
  directPlays: number;
  totalBitrate: string;
}

export interface TracearrStreamsSummary {
  total: number;
  transcodes: number;
  directStreams: number;
  directPlays: number;
  totalBitrate: string;
  byServer: TracearrServerStreamSummary[];
}

export interface TracearrStreamsResponse {
  data: TracearrStream[];
  summary: TracearrStreamsSummary;
}

export interface TracearrViolation {
  id: string;
  serverId: string;
  serverName: string;
  severity: "low" | "medium" | "high";
  acknowledged: boolean;
  data: Record<string, string>;
  createdAt: string;
  rule: {
    id: string;
    type: string;
    name: string;
  };
  user: {
    id: string;
    username: string;
    thumbUrl: string | null;
    avatarUrl: string | null;
  };
}

export interface TracearrViolationsResponse {
  data: TracearrViolation[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface TracearrHistorySession {
  id: string;
  serverId: string;
  serverName: string;
  state: "playing" | "paused" | "stopped";
  mediaType: "movie" | "episode" | "track" | "live" | "photo" | "unknown";
  mediaTitle: string;
  showTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  year: number | null;
  thumbPath: string | null;
  posterUrl: string | null;
  durationMs: number;
  progressMs: number;
  totalDurationMs: number;
  startedAt: string;
  stoppedAt: string | null;
  watched: boolean;
  segmentCount: number;
  device: string | null;
  player: string | null;
  product: string | null;
  platform: string | null;
  isTranscode: boolean;
  videoDecision: "directplay" | "copy" | "transcode" | null;
  audioDecision: "directplay" | "copy" | "transcode" | null;
  bitrate: number | null;
  resolution: string | null;
  user: {
    id: string;
    username: string;
    thumbUrl: string | null;
    avatarUrl: string | null;
  };
}

export interface TracearrHistoryResponse {
  data: TracearrHistorySession[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface TracearrDashboardData {
  stats: TracearrStatsResponse;
  streams: TracearrStreamsResponse;
  violations?: TracearrViolationsResponse;
  recentActivity?: TracearrHistoryResponse;
}

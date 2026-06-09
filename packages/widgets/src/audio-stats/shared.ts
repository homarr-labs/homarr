import type { TablerIcon } from "@tabler/icons-react";
import {
  IconAlbum,
  IconBook,
  IconBooks,
  IconDisc,
  IconHeadphones,
  IconMicrophone,
  IconMicrophone2,
  IconPlayerPlay,
} from "@tabler/icons-react";

import type { AudiobookshelfDashboardData, NavidromeDashboardData } from "@homarr/integrations/types";
import { formatDuration } from "@homarr/common";

export type AudioStatsBackend = "navidrome" | "audiobookshelf";

export interface NavidromeDisplayOptions {
  showArtists: boolean;
  showAlbums: boolean;
  showSongs: boolean;
  showNowPlaying: boolean;
  showNowPlayingList: boolean;
  maxNowPlayingItems: number;
  compactMode?: boolean;
}

export interface AudiobookshelfDisplayOptions {
  showLibraryCount: boolean;
  showAudiobooks: boolean;
  showPodcasts: boolean;
  showListeningTime: boolean;
  showActiveSessions: boolean;
  compactMode: boolean;
}

export type AudioStatsDisplayOptions = Partial<NavidromeDisplayOptions & AudiobookshelfDisplayOptions>;

const navidromeStatVisibilityOptions = {
  showArtists: "artists",
  showAlbums: "albums",
  showSongs: "songs",
} as const;

const audiobookshelfStatVisibilityOptions = {
  showLibraryCount: "libraryCount",
  showAudiobooks: "audiobooks",
  showPodcasts: "podcasts",
  showListeningTime: "listeningTime",
  showActiveSessions: "activeSessions",
} as const;

const statVisibilityOptionsByBackend = {
  navidrome: navidromeStatVisibilityOptions,
  audiobookshelf: audiobookshelfStatVisibilityOptions,
} as const;

const navidromeStatIcons = {
  artists: IconMicrophone2,
  albums: IconAlbum,
  songs: IconDisc,
} as const;

const audiobookshelfStatIcons = {
  libraryCount: IconBooks,
  audiobooks: IconBook,
  podcasts: IconMicrophone,
  listeningTime: IconHeadphones,
  activeSessions: IconPlayerPlay,
} as const;

const statIconsByBackend = {
  navidrome: navidromeStatIcons,
  audiobookshelf: audiobookshelfStatIcons,
} as const;

const gridColsByCompact = {
  true: [
    { minWidth: 280, cols: 5 },
    { minWidth: 180, cols: 3 },
    { minWidth: 110, cols: 2 },
    { minWidth: 0, cols: 1 },
  ],
  false: [
    { minWidth: 420, cols: 5 },
    { minWidth: 300, cols: 3 },
    { minWidth: 180, cols: 2 },
    { minWidth: 0, cols: 1 },
  ],
} as const;

const iconSizeByCompact = {
  true: [
    { minWidth: 260, size: 18 },
    { minWidth: 160, size: 16 },
    { minWidth: 0, size: 14 },
  ],
  false: [
    { minWidth: 320, size: 22 },
    { minWidth: 200, size: 18 },
    { minWidth: 0, size: 16 },
  ],
} as const;

export interface VisibleStat {
  optionKey: string;
  statKey: string;
  value: string | number;
  Icon: TablerIcon;
}

const getNavidromeStatValues = (stats: NavidromeDashboardData) =>
  ({
    artists: stats.artistCount,
    albums: stats.albumCount,
    songs: stats.songCount,
  }) as const;

const getAudiobookshelfStatValues = (stats: AudiobookshelfDashboardData) =>
  ({
    libraryCount: stats.libraryCount,
    audiobooks: stats.totalAudiobooks,
    podcasts: stats.totalPodcasts,
    listeningTime: formatDuration(stats.totalListeningTimeSeconds * 1000),
    activeSessions: stats.activeSessions,
  }) as const;

const statValueGetterByBackend = {
  navidrome: (stats: NavidromeDashboardData | AudiobookshelfDashboardData) =>
    getNavidromeStatValues(stats as NavidromeDashboardData),
  audiobookshelf: (stats: NavidromeDashboardData | AudiobookshelfDashboardData) =>
    getAudiobookshelfStatValues(stats as AudiobookshelfDashboardData),
} as const;

export const getVisibleStats = (
  backend: AudioStatsBackend,
  options: AudioStatsDisplayOptions,
  stats: NavidromeDashboardData | AudiobookshelfDashboardData,
): VisibleStat[] => {
  const visibilityOptions = statVisibilityOptionsByBackend[backend];
  const statIcons = statIconsByBackend[backend];
  const statValues = statValueGetterByBackend[backend](stats);

  return Object.entries(visibilityOptions)
    .filter(([optionKey]) => Boolean(options[optionKey as keyof typeof visibilityOptions]))
    .map(([optionKey, statKey]) => ({
      optionKey,
      statKey,
      value: statValues[statKey as keyof typeof statValues],
      Icon: statIcons[statKey as keyof typeof statIcons],
    }));
};

export const getGridCols = (width: number, visibleCount: number, compact: boolean): number => {
  const colsTable = gridColsByCompact[String(compact) as keyof typeof gridColsByCompact];
  const match = colsTable.find(({ minWidth }) => width >= minWidth);
  const maxCols = match?.cols ?? 1;
  return Math.min(maxCols, Math.max(visibleCount, 1));
};

const fallbackIconSize = { true: 14, false: 16 } as const;

export const getIconSize = (width: number, compact: boolean): number => {
  const sizeTable = iconSizeByCompact[String(compact) as keyof typeof iconSizeByCompact];
  const match = sizeTable.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? fallbackIconSize[String(compact) as keyof typeof fallbackIconSize];
};

export const AUDIO_STATS_TRANSLATION_SCOPE = "widget.audioStats" as const;

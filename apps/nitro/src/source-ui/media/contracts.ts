import type { ReactNode } from "react";

export interface MediaDisplayItem {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly creatorId: string | null;
  readonly creator: {
    readonly id: string;
    readonly name: string | null;
    readonly image: string | null;
    readonly email?: string | null;
  } | null;
}

export interface MediaDisplaySelection {
  readonly id: string;
  readonly url: string;
}

export interface MediaTableProps {
  readonly items: readonly MediaDisplayItem[];
  readonly createLocalImageUrl: (id: string) => string;
  readonly formatSize: (size: number) => string;
  readonly canShowDelete: (media: MediaDisplayItem) => boolean;
  readonly deleteUnavailableReason: string;
  readonly selectedId?: string;
  readonly onSelect?: (selection: MediaDisplaySelection) => void;
  readonly renderCreator?: (creator: NonNullable<MediaDisplayItem["creator"]>) => ReactNode;
}

export interface MediaManagementViewProps {
  readonly title?: string;
  readonly primaryAction?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly footer?: ReactNode;
  readonly notice?: ReactNode;
  readonly children: ReactNode;
  readonly renderLayout: (slots: MediaManagementLayoutSlots) => ReactNode;
}

export interface MediaManagementLayoutSlots {
  readonly title: ReactNode;
  readonly primaryAction?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

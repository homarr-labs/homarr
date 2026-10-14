import type { PropsWithChildren, ReactNode } from "react";
import type { AffixPosition, MantineSize } from "@mantine/core";

export type ManageContainerProps = PropsWithChildren<{ size?: MantineSize }>;

export interface ManagePageLayoutViewProps {
  title: ReactNode;
  breadcrumb: ReactNode;
  primaryAction?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  floatingPrimaryAction?: boolean;
  floatingActionBottomOffset: number;
  size?: MantineSize;
  children: ReactNode;
}

export interface ManageCollectionPageProps extends Omit<ManagePageLayoutViewProps, "children"> {
  ariaLabel: string;
  itemCount: number;
  emptyState: ReactNode;
  children: ReactNode;
}

export interface ManageCollectionListProps {
  ariaLabel: string;
  children: ReactNode;
}

export interface ManageCollectionItemProps {
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  actionsAlignment?: "flex-start" | "center";
}

export interface SectionCardProps {
  title: ReactNode;
  children: ReactNode;
}

export interface DangerZoneRootViewProps {
  heading: string;
  children: ReactNode[] | ReactNode;
}

export interface DangerZoneItemProps {
  label: string;
  description: string;
  action: ReactNode;
}

export interface UnsavedChangesBarViewProps {
  label: string;
  children: ReactNode;
}

export interface ManageStickyFooterProps {
  secondary?: ReactNode;
  children: ReactNode;
}

export type ManageMobilePrimaryActionProps = PropsWithChildren<{
  actionButtonMinWidth: number;
  affixPosition: AffixPosition;
}>;

export interface HeroBannerViewProps {
  title: ReactNode;
  subtitle: ReactNode;
  logoImageUrl: string;
  logoAlt: string;
  marquee: ReactNode;
}

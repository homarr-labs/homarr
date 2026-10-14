import type { ReactNode } from "react";
import type { MRT_ColumnDef, MRT_Localization } from "mantine-react-table";

export type DockerViewAction = "start" | "stop" | "restart" | "remove";

export interface DockerViewContainer {
  resourceId: string;
  endpointId: string;
  endpointName: string;
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface DockerActionViewProps<Container extends DockerViewContainer> {
  containers: Container[];
  pending: boolean;
  labels: Record<DockerViewAction, string> & { addApps: string; logs: string; title: string };
  canRun: (action: DockerViewAction, containers: Container[]) => boolean;
  onAction?: (action: DockerViewAction, containers: Container[]) => void;
  onAddApps?: (containers: Container[]) => void;
}

export interface DockerTableViewProps<Container extends DockerViewContainer> {
  containers: Container[];
  columns: MRT_ColumnDef<Container>[];
  localization: MRT_Localization;
  fetching: boolean;
  actionPending?: boolean;
  searchLabel: string;
  selectedLabel: (selected: number, total: number) => string;
  updatedLabel: string;
  emptyLabel: string;
  unavailableLabel?: string;
  refreshLabel: string;
  onRefresh?: () => void;
  renderRowActions: (container: Container) => ReactNode;
  renderSelectedActions: (containers: Container[]) => ReactNode;
}

export interface DockerAddAppsViewProps {
  opened: boolean;
  title: string;
  containers: DockerViewContainer[];
  urls: string[];
  errors: (string | undefined)[];
  pending: boolean;
  unavailableReason?: string;
  feedback?: ReactNode;
  cancelLabel: string;
  addLabel: string;
  onUrlChange: (index: number, url: string) => void;
  onClose: () => void;
  onSubmit?: () => void;
}

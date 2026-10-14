import type { ComponentType, ReactNode, Ref } from "react";
import type { AffixPosition, MantineSize } from "@mantine/core";
import type { z } from "zod";

import type { appManageSchema } from "@homarr/validation/app";

export interface AppDisplay {
  id: string;
  name: string;
  iconUrl: string;
  description: string | null;
  href: string | null;
  pingUrl: string | null;
}

export interface SourceAppFormHandle {
  submit: () => Promise<boolean>;
  isDirty: () => boolean;
}

export interface SourceAppFormProps {
  showBackToOverview: boolean;
  buttonLabels: {
    submit: string;
    submitAndCreateAnother?: string;
  };
  initialValues?: z.output<typeof appManageSchema>;
  handleSubmit: (
    values: z.output<typeof appManageSchema>,
    redirect: boolean,
    afterSuccess?: () => void,
  ) => void | Promise<void>;
  isPending: boolean;
  onDirtyChange: (dirty: boolean) => void;
  captureSubmissionOwner: () => { isCurrent: () => boolean };
  hideButtons?: boolean;
  formRef?: Ref<SourceAppFormHandle>;
}

export type SourceAppFormComponent = ComponentType<SourceAppFormProps>;

export interface AppsManagementPresentation {
  CollectionPage: ComponentType<{
    title: ReactNode;
    breadcrumb: ReactNode;
    primaryAction?: ReactNode;
    toolbar?: ReactNode;
    footer?: ReactNode;
    floatingPrimaryAction?: boolean;
    floatingActionBottomOffset: number;
    size?: MantineSize;
    ariaLabel: string;
    itemCount: number;
    emptyState: ReactNode;
    children: ReactNode;
  }>;
  CollectionItem: ComponentType<{
    leading?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    metadata?: ReactNode;
    badges?: ReactNode;
    actions?: ReactNode;
    actionsAlignment?: "flex-start" | "center";
  }>;
  MobilePrimaryAction: ComponentType<{
    actionButtonMinWidth: number;
    affixPosition: AffixPosition;
    children: ReactNode;
  }>;
  breadcrumb: ReactNode;
  floatingActionBottomOffset: number;
  actionButtonMinWidth: number;
  affixPosition: AffixPosition;
  tourTarget?: (id: "manage-apps-create" | "manage-apps-list", children: ReactNode) => ReactNode;
}

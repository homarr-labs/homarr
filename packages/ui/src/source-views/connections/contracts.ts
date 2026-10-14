import type { ComponentPropsWithRef, ComponentType, ReactNode, Ref } from "react";
import type { FileInputProps, SegmentedControlItem } from "@mantine/core";

export interface AppItemSlots {
  leading: ReactNode;
  title: ReactNode;
  description: ReactNode;
  metadata: ReactNode;
  actions: ReactNode;
}

export interface AppItemViewProps {
  id: string;
  name: string;
  iconUrl: string | null;
  description: string | null;
  href: string | null;
  safeHref: string | null;
  editLabel: string;
  editLink: ComponentType<ComponentPropsWithRef<"a">>;
  deleteAction?: ReactNode;
  renderItem: (slots: AppItemSlots) => ReactNode;
}

export type IntegrationSecretDisplay = { kind: "public"; value: string | null } | { kind: "redacted" };

export interface IntegrationSecretCardViewProps {
  display: IntegrationSecretDisplay;
  kindIcon: ReactNode;
  kindLabel: string;
  lastUpdated: string | null;
  copy: {
    notSetTooltip: string;
    notSetLabel: string;
    show: string;
    hide: string;
    edit: string;
    cancel: string;
  };
  children: ReactNode;
  onCancel: () => Promise<boolean>;
}

export interface IntegrationSecretKindsViewProps {
  data: SegmentedControlItem<string>[];
  defaultValue?: string;
  onChange: (value: string) => void;
}

export interface CertificateFileInputBinding extends Pick<
  FileInputProps,
  "error" | "onBlur" | "onFocus" | "id" | "name"
> {
  value: File | null;
  onChange: (value: File | null) => void;
  ref?: Ref<HTMLButtonElement>;
}

export interface CertificateUploadViewProps {
  embedded?: boolean;
  fileInputProps: CertificateFileInputBinding;
  pending: boolean;
  copy: {
    label: string;
    cancel: string;
    add: string;
  };
  onCancel?: () => void;
  onSubmit: () => Promise<void>;
}

export interface CertificateDetailsViewProps {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprint: string;
  copy: {
    title: string;
    description: string;
    contentAction: string;
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    serialNumber: string;
    fingerprint: string;
  };
  onOpenPem: () => void;
}

export interface PemContentViewProps {
  content: string;
  closeLabel: string;
  onClose: () => void;
}

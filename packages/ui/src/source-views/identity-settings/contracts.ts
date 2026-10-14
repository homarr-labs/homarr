import type { ComponentPropsWithRef, ComponentType, ReactNode } from "react";
import type { MantineSpacing } from "@mantine/core";

export type IdentitySettingsLinkProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  href: string;
};

export type IdentitySettingsLinkComponent = ComponentType<IdentitySettingsLinkProps>;

export interface StepperNavigationViewProps {
  hasPrevious: boolean;
  hasNext: boolean;
  isComplete: boolean;
  isLoadingNextStep: boolean;
  prevStep: () => void;
  nextStep: () => void;
  reset: () => void;
  previousLabel: string;
  nextLabel: string;
  createAnotherLabel: string;
  backLabel: string;
  backHref: string;
  linkComponent: IdentitySettingsLinkComponent;
}

export interface ReservedGroupAlertViewProps {
  renderMessage: (documentationLink: ReactNode) => ReactNode;
  documentationLabel: string;
  documentationHref: string;
  linkComponent: IdentitySettingsLinkComponent;
}

export interface SettingSwitchViewProps {
  checked: boolean;
  disabled?: boolean;
  title: string;
  text: ReactNode;
  ms?: MantineSpacing;
  onToggle: () => void;
}

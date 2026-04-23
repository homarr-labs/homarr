import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("healthMonitoring"),
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        fahrenheit: factory.switch({ defaultValue: false }),
        cpu: factory.switch({ defaultValue: true }),
        memory: factory.switch({ defaultValue: true }),
        gpu: factory.switch({ defaultValue: true }),
        showUptime: factory.switch({ defaultValue: true }),
        fileSystem: factory.switch({ defaultValue: true }),
        visibleClusterSections: factory.multiSelect({
          options: [
            { value: "node", label: (t: (s: string) => string) => t("widget.healthMonitoring.cluster.resource.node.name") },
            { value: "qemu", label: (t: (s: string) => string) => t("widget.healthMonitoring.cluster.resource.qemu.name") },
            { value: "lxc", label: (t: (s: string) => string) => t("widget.healthMonitoring.cluster.resource.lxc.name") },
            { value: "storage", label: (t: (s: string) => string) => t("widget.healthMonitoring.cluster.resource.storage.name") },
          ] as const,
          defaultValue: ["node", "qemu", "lxc", "storage"] as const,
        }),
        defaultTab: factory.select({
          defaultValue: "system" as const,
          options: [
            { value: "system", label: "System" },
            { value: "cluster", label: "Cluster" },
          ] as const,
        }),
        sectionIndicatorRequirement: factory.select({
          defaultValue: "all" as const,
          options: [
            { value: "all", label: "All active" },
            { value: "any", label: "Any active" },
          ] as const,
        }),
      }),
      {
        fahrenheit: {
          shouldHide(_, integrationKinds) {
            return integrationKinds.every((kind) => kind === "proxmox") || integrationKinds.length === 0;
          },
        },
        fileSystem: {
          shouldHide(_, integrationKinds) {
            return integrationKinds.every((kind) => kind === "proxmox") || integrationKinds.length === 0;
          },
        },
        showUptime: {
          shouldHide(_, integrationKinds) {
            return !integrationKinds.includes("proxmox");
          },
        },
        sectionIndicatorRequirement: {
          shouldHide(_, integrationKinds) {
            return !integrationKinds.includes("proxmox");
          },
        },
        visibleClusterSections: {
          shouldHide(_, integrationKinds) {
            return !integrationKinds.includes("proxmox");
          },
        },
      },
    );
  },
};

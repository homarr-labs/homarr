import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { getIntegrationName } from "@homarr/definitions";
import type { SystemHealthMonitoring } from "@homarr/integrations/types";
import type { ScopedTranslationFunction } from "@homarr/translation";

import { isSameStorageDevice, storageDeviceNamesMatch } from "../filter-storage-volumes";
import type { HealthSystem } from "./model";

dayjs.extend(duration);
type SmartStatusReason = SystemHealthMonitoring["smart"][number]["statusReason"];

export const formatUptime = (uptimeInSeconds: number, t: ScopedTranslationFunction<"widget.healthMonitoring">) => {
  const uptimeDuration = dayjs.duration(uptimeInSeconds, "seconds");
  const months = uptimeDuration.months();
  const days = uptimeDuration.days();
  const hours = uptimeDuration.hours();
  const minutes = uptimeDuration.minutes();

  return t("popover.uptime", {
    months: String(months),
    days: String(days),
    hours: String(hours),
    minutes: String(minutes),
  });
};

export const progressColor = (percentage: number) => {
  if (percentage < 40) return "green";
  else if (percentage < 60) return "yellow";
  else if (percentage < 90) return "orange";
  else return "red";
};

interface FileSystem {
  deviceName: string;
  used: string;
  available: string;
  percentage: number;
}

interface SmartData {
  deviceName: string;
  temperature: number | null;
  overallStatus: string;
  healthy?: boolean;
  statusReason?: SmartStatusReason;
}

export const matchFileSystemAndSmart = (fileSystems: FileSystem[], smartData: SmartData[]) => {
  return fileSystems
    .map((fileSystem) => {
      const smartDisk = smartData.find((smart) => storageDeviceNamesMatch(smart.deviceName, fileSystem.deviceName));

      // Take the SMART name only for the same disk (sda1 -> sda). A controller-level match (nvme0 for
      // nvme0n1 and nvme0n2) keeps the file system name, so namespaces stay distinct.
      const isSameDisk = smartDisk !== undefined && isSameStorageDevice(smartDisk.deviceName, fileSystem.deviceName);

      return {
        deviceName: isSameDisk ? smartDisk.deviceName : fileSystem.deviceName,
        used: fileSystem.used,
        available: fileSystem.available,
        percentage: fileSystem.percentage,
        temperature: smartDisk?.temperature ?? null,
        overallStatus: smartDisk?.overallStatus ?? "",
        healthy: smartDisk?.healthy,
        statusReason: smartDisk?.statusReason,
      };
    })
    .toSorted((fileSystemA, fileSystemB) => fileSystemA.deviceName.localeCompare(fileSystemB.deviceName));
};

export function createSystemNameFormatter(systems: readonly HealthSystem[]) {
  const counts = new Map<string, number>();
  for (const { name } of systems) counts.set(name, (counts.get(name) ?? 0) + 1);

  const idsByLabel = new Map<string, string[]>();
  for (const { id, name, kind } of systems) {
    if (counts.get(name) === 1) continue;
    const label = `${getIntegrationName(kind)} · ${name}`;
    const ids = idsByLabel.get(label);
    if (ids) ids.push(id);
    else idsByLabel.set(label, [id]);
  }

  const labels = new Map<string, string>();
  const usedLabels = new Set(counts.keys());
  for (const [label, ids] of idsByLabel) {
    // Number identical provider/name pairs by stable integration ID, independent of rank or page.
    let ordinal = 0;
    for (const id of ids.toSorted()) {
      let displayName = label;
      if (ids.length > 1 || usedLabels.has(label)) {
        do {
          ordinal++;
          displayName = `#${ordinal} ${label}`;
        } while (usedLabels.has(displayName));
      }
      labels.set(id, displayName);
      usedLabels.add(displayName);
    }
  }
  return ({ id, name }: HealthSystem) => labels.get(id) ?? name;
}

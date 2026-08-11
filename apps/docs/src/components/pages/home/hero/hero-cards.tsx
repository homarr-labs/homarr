import { IconBrandDocker, IconCpu, IconDeviceDesktopAnalytics } from "@tabler/icons-react";

import styles from "../../../../pages/index.module.css";
import { AppWidget } from "./widgets/app-widget";
import { ClockWidget } from "./widgets/clock-widget";
import { AssistantProviderWidget } from "./widgets/assistant-provider-widget";
import { DownloadsWidget } from "./widgets/downloads-widget";
import { WeatherWidget } from "./widgets/weather-widget";
import { EntityStateWidget } from "./widgets/entity-state-widget";
import { WidgetCard } from "./widgets/card";

export const HeroCards = () => {
  return (
    <div className={`argos-ignore ${styles.heroCards}`}>
      <SystemResourcesWidget />
      <WeatherWidget />
      <ClockWidget />
      <DownloadsWidget />
      <AssistantProviderWidget />
      <DockerWidget />
      <EntityStateWidget />
      <AppWidget />
    </div>
  );
};

const SystemResourcesWidget = () => (
  <WidgetCard width={2} className={styles.resourcesWidget}>
    <div className={styles.widgetHeading}>
      <span className={styles.widgetTitle}>
        <IconDeviceDesktopAnalytics size={17} aria-hidden="true" />
        System resources
      </span>
      <span className={styles.onlineStatus}>Online</span>
    </div>
    <ResourceMeter icon={<IconCpu size={15} aria-hidden="true" />} label="CPU" value={34} />
    <ResourceMeter label="Memory" value={62} />
  </WidgetCard>
);

const ResourceMeter = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) => (
  <div className={styles.resourceMeter}>
    <div className={styles.resourceLabel}>
      <span>
        {icon}
        {label}
      </span>
      <span>{value}%</span>
    </div>
    <progress className={styles.resourceTrack} aria-label={`${label} usage`} max={100} value={value} />
  </div>
);

const DockerWidget = () => (
  <WidgetCard width={2} className={styles.dockerWidget}>
    <div className={styles.widgetHeading}>
      <span className={styles.widgetTitle}>
        <IconBrandDocker size={18} aria-hidden="true" />
        Docker
      </span>
      <span className={styles.dockerCount}>3 running</span>
    </div>
    <div className={styles.containerList}>
      {[
        ["immich", "Healthy"],
        ["jellyfin", "Running"],
        ["home-assistant", "Running"],
      ].map(([name, status]) => (
        <div className={styles.containerRow} key={name}>
          <span className={styles.containerName}>{name}</span>
          <span className={styles.containerStatus}>
            <span className={styles.statusDot} aria-hidden="true" />
            {status}
          </span>
        </div>
      ))}
    </div>
  </WidgetCard>
);

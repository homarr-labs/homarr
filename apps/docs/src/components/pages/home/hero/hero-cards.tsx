import { IconBrandDocker, IconCpu, IconDeviceDesktopAnalytics } from "@tabler/icons-react";

import styles from "../../../../pages/index.module.css";
import { AppWidget } from "./widgets/app-widget";
import { ClockWidget } from "./widgets/clock-widget";
import { DownloadsWidget } from "./widgets/downloads-widget";
import { EntityStateWidget } from "./widgets/entity-state-widget";
import { StockWidget } from "./widgets/stock-widget";
import { WeatherWidget } from "./widgets/weather-widget";
import { WidgetCard } from "./widgets/card";

export const HeroCards = () => {
  return (
    <div className={`argos-ignore hero-cards ${styles.heroCards}`}>
      <StockWidget />
      <AppWidget name="Plex" />
      <AppWidget name="Jellyfin" />
      <AppWidget name="Homeassistant" label="Home Assistant" />
      <ClockWidget />
      <SystemResourcesWidget />
      <WeatherWidget />
      <EntityStateWidget />
      <AppWidget name="PiHole" label="Pi-hole" />
      <AppWidget name="qBittorrent" />
      <DownloadsWidget />
      <DockerWidget />
      <AppWidget name="Sonarr" />
      <AppWidget name="Radarr" />
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
    <ResourceMeter label="Disk" value={98} />
  </WidgetCard>
);

const ResourceMeter = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) => (
  <div className={`${styles.resourceMeter} ${value >= 90 ? styles.resourceMeterCritical : ""}`}>
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
      <span className={styles.dockerCount}>2 running · 1 failed</span>
    </div>
    <div className={styles.containerList}>
      {[
        ["immich", "Healthy"],
        ["jellyfin", "Running"],
        ["paperless", "Exited"],
      ].map(([name, status]) => (
        <div className={`${styles.containerRow} ${status === "Exited" ? styles.containerRowFailed : ""}`} key={name}>
          <span className={styles.containerName}>{name}</span>
          <span className={styles.containerStatus}>
            <span
              className={`${styles.statusDot} ${status === "Exited" ? styles.statusDotFailed : ""}`}
              aria-hidden="true"
            />
            {status}
          </span>
        </div>
      ))}
    </div>
  </WidgetCard>
);

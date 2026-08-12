import { translate } from "@docusaurus/Translate";
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

const heroLabels = {
  systemResources: translate({ id: "homepage.preview.systemResources", message: "System resources" }),
  online: translate({ id: "homepage.preview.online", message: "Online" }),
  cpu: translate({ id: "homepage.preview.cpu", message: "CPU" }),
  memory: translate({ id: "homepage.preview.memory", message: "Memory" }),
  disk: translate({ id: "homepage.preview.disk", message: "Disk" }),
  docker: translate({ id: "homepage.preview.docker", message: "Docker" }),
  dockerSummary: translate({ id: "homepage.preview.dockerSummary", message: "2 running · 1 failed" }),
  healthy: translate({ id: "homepage.preview.healthy", message: "Healthy" }),
  running: translate({ id: "homepage.preview.running", message: "Running" }),
  exited: translate({ id: "homepage.preview.exited", message: "Exited" }),
};

const SystemResourcesWidget = () => (
  <WidgetCard width={2} className={styles.resourcesWidget}>
    <div className={styles.widgetHeading}>
      <span className={styles.widgetTitle}>
        <IconDeviceDesktopAnalytics size={17} aria-hidden="true" />
        {heroLabels.systemResources}
      </span>
      <span className={styles.onlineStatus}>{heroLabels.online}</span>
    </div>
    <ResourceMeter icon={<IconCpu size={15} aria-hidden="true" />} label={heroLabels.cpu} value={34} />
    <ResourceMeter label={heroLabels.memory} value={62} />
    <ResourceMeter label={heroLabels.disk} value={98} />
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
        {heroLabels.docker}
      </span>
      <span className={styles.dockerCount}>{heroLabels.dockerSummary}</span>
    </div>
    <div className={styles.containerList}>
      {[
        { name: "immich", status: heroLabels.healthy, failed: false },
        { name: "jellyfin", status: heroLabels.running, failed: false },
        { name: "paperless", status: heroLabels.exited, failed: true },
      ].map(({ name, status, failed }) => (
        <div className={`${styles.containerRow} ${failed ? styles.containerRowFailed : ""}`} key={name}>
          <span className={styles.containerName}>{name}</span>
          <span className={styles.containerStatus}>
            <span className={`${styles.statusDot} ${failed ? styles.statusDotFailed : ""}`} aria-hidden="true" />
            {status}
          </span>
        </div>
      ))}
    </div>
  </WidgetCard>
);

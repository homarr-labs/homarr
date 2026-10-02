import { SectionContainer } from "@/components/pages/home/container/section-container";

import styles from "./dataflow.module.css";

const services = {
  left: [
    ["Radarr", "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/radarr.svg"],
    ["Sonarr", "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/sonarr.svg"],
    ["Lidarr", "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/lidarr.svg"],
  ],
  right: [
    ["SABnzbd", "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/sabnzbd.svg"],
    ["Jellyfin", "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/jellyfin.svg"],
    ["Plex", "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/plex.svg"],
  ],
} as const;

function ServiceColumn({ side }: { side: keyof typeof services }) {
  return (
    <div className={`${styles.serviceColumn} ${side === "left" ? styles.leftColumn : styles.rightColumn}`}>
      {services[side].map(([name, iconUrl]) => (
        <div className={styles.service} key={name}>
          <img src={iconUrl} alt="" width={46} height={46} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  );
}

export function HomeDataflow() {
  return (
    <section className={styles.section} aria-labelledby="integration-flow-title">
      <SectionContainer>
        <div className={styles.heading}>
          <h2 id="integration-flow-title">No YAML configurations. Easy and quick to manage integrations.</h2>
        </div>

        <div className={styles.map} aria-label="Services connected to Homarr">
          <svg className={styles.connections} aria-hidden="true" viewBox="0 0 800 300" preserveAspectRatio="none">
            <path d="M95 42 C250 42 245 150 400 150" />
            <path d="M95 150 H400" />
            <path d="M95 258 C250 258 245 150 400 150" />
            <path d="M705 42 C550 42 555 150 400 150" />
            <path d="M705 150 H400" />
            <path d="M705 258 C550 258 555 150 400 150" />
          </svg>
          <ServiceColumn side="left" />
          <div className={styles.homarrNode}>
            <span className={styles.logoShell}>
              <img src="/img/logo.svg" alt="" width={62} height={44} />
            </span>
            <strong>Homarr</strong>
          </div>
          <ServiceColumn side="right" />
        </div>
      </SectionContainer>
    </section>
  );
}

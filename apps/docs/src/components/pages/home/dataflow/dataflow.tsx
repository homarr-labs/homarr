import styles from "../../../../pages/index.module.css";
import { supportedIntegrations } from "../../../../constants/supported-integrations";

const featuredIntegrations = [
  { name: "Radarr", position: styles.dataflowNodeTopLeft },
  { name: "Sonarr", position: styles.dataflowNodeMiddleLeft },
  { name: "Lidarr", position: styles.dataflowNodeBottomLeft },
  { name: "SABnzbd", position: styles.dataflowNodeTopRight },
  { name: "Jellyfin", position: styles.dataflowNodeMiddleRight },
].map((node) => ({
  ...node,
  image: supportedIntegrations.find((integration) => integration.name === node.name)?.iconUrl ?? "",
}));

const featuredNames = new Set(["Homarr", ...featuredIntegrations.map((integration) => integration.name)]);
const otherIntegrations = supportedIntegrations.filter((integration) => !featuredNames.has(integration.name));
const iconCycleStepInSeconds = 1.4;

const paths = [
  "M145 82 C330 82 330 235 480 260",
  "M145 260 C300 260 360 260 480 260",
  "M145 438 C330 438 330 285 480 260",
  "M480 260 C630 235 630 82 815 82",
  "M480 260 C600 260 660 260 815 260",
  "M480 260 C630 285 630 438 815 438",
];

export const DataflowVisualizationComponent = () => (
  <section className={styles.dataflowSection}>
    <div className={styles.dataflowHeading}>
      <h2>
        No YAML configurations.
        <br />
        Easy and quick to manage integrations.
      </h2>
      <p>Homarr brings status, controls, and updates together in one dashboard.</p>
    </div>

    <div
      className={styles.dataflowDiagram}
      role="img"
      aria-label="Information flowing both ways between Homarr, Radarr, Sonarr, Lidarr, SABnzbd, Jellyfin, and 19 more integrations"
    >
      <svg className={styles.dataflowLines} viewBox="0 0 960 520" preserveAspectRatio="none" aria-hidden="true">
        {paths.map((path) => (
          <g key={path}>
            <path className={styles.dataflowLine} d={path} pathLength="1" />
            <path className={styles.dataflowSignal} d={path} pathLength="1" />
            <path className={styles.dataflowSignalReverse} d={path} pathLength="1" />
          </g>
        ))}
      </svg>

      {featuredIntegrations.map((integration) => (
        <div className={`${styles.dataflowNode} ${integration.position}`} key={integration.name}>
          <img src={integration.image} alt="" width={54} height={54} />
        </div>
      ))}

      <div className={`${styles.dataflowNode} ${styles.dataflowNodeBottomRight}`}>
        <div className={styles.dataflowMoreIcons} aria-hidden="true">
          {otherIntegrations.map((integration, index) => (
            <img
              src={integration.iconUrl}
              alt=""
              width={54}
              height={54}
              key={integration.name}
              style={{
                animationDelay: `${-index * iconCycleStepInSeconds}s`,
                animationDuration: `${otherIntegrations.length * iconCycleStepInSeconds}s`,
              }}
            />
          ))}
        </div>
        <span>+{otherIntegrations.length} more</span>
      </div>

      <div className={`${styles.dataflowNode} ${styles.dataflowHub}`}>
        <img src="/img/logo.png" alt="" width={86} height={86} />
      </div>
    </div>
  </section>
);

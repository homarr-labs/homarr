import styles from "../../../../pages/index.module.css";
import { supportedIntegrations } from "../../../../constants/supported-integrations";

const nodePositions = [
  styles.dataflowNodeTopLeft,
  styles.dataflowNodeMiddleLeft,
  styles.dataflowNodeBottomLeft,
  styles.dataflowNodeTopRight,
  styles.dataflowNodeMiddleRight,
  styles.dataflowNodeBottomRight,
];
const cyclingIntegrations = supportedIntegrations.filter((integration) => integration.name !== "Homarr");

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
      aria-label={`Information flowing both ways between Homarr and rotating examples from ${cyclingIntegrations.length} supported integrations`}
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

      {nodePositions.map((position, nodeIndex) => {
        const cycleStepInSeconds = 1.2 + nodeIndex * 0.13;
        const phaseOffsetInSeconds = nodeIndex * 2.7;

        return (
          <div className={`${styles.dataflowNode} ${position}`} key={position}>
            <div className={styles.dataflowCyclingIcons} aria-hidden="true">
              {cyclingIntegrations.map((_, integrationIndex) => {
                const integration =
                  cyclingIntegrations[(integrationIndex + nodeIndex * 4) % cyclingIntegrations.length];

                return (
                  <img
                    src={integration.iconUrl}
                    alt=""
                    width={54}
                    height={54}
                    key={integration.name}
                    style={{
                      animationDelay: `${-(integrationIndex * cycleStepInSeconds + phaseOffsetInSeconds)}s`,
                      animationDuration: `${cyclingIntegrations.length * cycleStepInSeconds}s`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <div className={`${styles.dataflowNode} ${styles.dataflowHub}`}>
        <img src="/img/logo.png" alt="" width={86} height={86} />
      </div>
    </div>
  </section>
);

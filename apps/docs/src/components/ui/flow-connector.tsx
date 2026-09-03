import type { CSSProperties } from "react";

import styles from "./flow-connector.module.css";

type FlowConnectorProps = {
  label?: string;
  animationDelay?: number;
  orientation?: "responsive" | "vertical";
};

export function FlowConnector({ label, animationDelay = 0, orientation = "responsive" }: FlowConnectorProps) {
  let className = styles.connector;
  if (orientation === "vertical") className = `${className} ${styles.vertical}`;
  const style = { "--flow-delay": `${animationDelay}ms` } as CSSProperties;

  let accessibleLabel = <span className={styles.visuallyHidden}>then</span>;
  if (label) accessibleLabel = <small className={styles.label}>{label}</small>;

  return (
    <span className={className} style={style}>
      {accessibleLabel}
      <span className={styles.track} aria-hidden="true">
        <span className={styles.rail} />
        <span className={styles.beam} />
      </span>
    </span>
  );
}

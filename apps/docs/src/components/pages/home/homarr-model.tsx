import Link from "@docusaurus/Link";
import {
  IconArrowRight,
  IconExternalLink,
  IconLayoutBoard,
  IconPlugConnected,
  IconServer,
  IconSparkles,
} from "@tabler/icons-react";
import clsx from "clsx";

import styles from "./homarr-model.module.css";

interface HomarrModelProps {
  className?: string;
  compact?: boolean;
}

export function HomarrModel({ className, compact = false }: HomarrModelProps) {
  return (
    <section className={clsx(styles.model, compact && styles.compact, className)} aria-labelledby="homarr-model-title">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>The Homarr model</p>
        <h2 id="homarr-model-title">Two paths from a service to your board</h2>
        <p>
          Apps open services. Integrations connect to their APIs. Widgets turn integration data into useful views and
          controls. A board arranges both.
        </p>
      </div>

      <figure className={styles.flow}>
        <div className={styles.flowLabels} aria-hidden="true">
          <span>Your stack</span>
          <span>Homarr objects</span>
          <span>Your board</span>
        </div>
        <div className={styles.lane}>
          <ModelNode icon={IconServer} label="Service" detail="Jellyfin, Immich, Pi-hole…" tone="source" />
          <FlowArrow />
          <ModelNode icon={IconExternalLink} label="App" detail="Name, URL, icon" href="/docs/management/apps" />
          <FlowArrow />
          <ModelNode icon={IconLayoutBoard} label="Board" detail="A shortcut you can open" tone="destination" />
        </div>
        <div className={styles.lane}>
          <ModelNode icon={IconServer} label="Service" detail="API or server endpoint" tone="source" />
          <FlowArrow />
          <ModelNode
            icon={IconPlugConnected}
            label="Integration"
            detail="Server-side connection"
            href="/docs/management/integrations"
          />
          <FlowArrow />
          <ModelNode icon={IconSparkles} label="Widget" detail="Data and actions" href="/docs/category/widgets" />
          <FlowArrow />
          <ModelNode icon={IconLayoutBoard} label="Board" detail="A live, interactive tile" tone="destination" />
        </div>
        <figcaption>
          An app does not need an integration. Some widgets also work without one.
          <Link to="/docs/getting-started/after-the-installation"> Explore the core concepts.</Link>
        </figcaption>
      </figure>
    </section>
  );
}

function ModelNode({
  icon: Icon,
  label,
  detail,
  href,
  tone,
}: {
  icon: typeof IconServer;
  label: string;
  detail: string;
  href?: string;
  tone?: "source" | "destination";
}) {
  const content = (
    <>
      <span className={styles.nodeIcon}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </>
  );

  if (href) {
    return (
      <Link className={styles.node} data-tone={tone} to={href}>
        {content}
      </Link>
    );
  }

  return (
    <div className={styles.node} data-tone={tone}>
      {content}
    </div>
  );
}

function FlowArrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      <i />
      <IconArrowRight size={17} />
    </span>
  );
}

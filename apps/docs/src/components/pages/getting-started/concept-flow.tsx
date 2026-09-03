import Link from "@docusaurus/Link";
import { IconArrowRight, IconLayoutBoard, IconPlugConnected, IconServer, IconSparkles } from "@tabler/icons-react";

import styles from "./concept-flow.module.css";

export function ConceptFlow() {
  return (
    <section className={styles.model} aria-label="How service data reaches a board">
      <div className={styles.flow}>
        <div className={styles.lane}>
          <Concept icon={IconServer} label="Service" detail="API or server endpoint" />
          <FlowArrow />
          <Concept
            icon={IconPlugConnected}
            label="Integration"
            detail="Server-side connection"
            href="/docs/management/integrations"
          />
          <FlowArrow />
          <Concept icon={IconSparkles} label="Widget" detail="Data and actions" href="/docs/category/widgets" />
          <FlowArrow />
          <Concept icon={IconLayoutBoard} label="Board" detail="A live, interactive tile" />
        </div>
      </div>
    </section>
  );
}

function Concept({
  icon: Icon,
  label,
  detail,
  href,
}: {
  icon: typeof IconServer;
  label: string;
  detail: string;
  href?: string;
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
      <Link className={styles.node} to={href}>
        {content}
      </Link>
    );
  }

  return <div className={styles.node}>{content}</div>;
}

function FlowArrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      <IconArrowRight size={20} stroke={2.5} />
    </span>
  );
}

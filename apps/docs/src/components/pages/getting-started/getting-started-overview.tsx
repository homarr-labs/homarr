import Link from "@docusaurus/Link";
import { IconArrowRight, IconLayoutBoard, IconPlugConnected, IconServer, IconSparkles } from "@tabler/icons-react";

import { HomarrModel } from "../home/homarr-model";
import styles from "./getting-started-overview.module.css";

export function GettingStartedOverview() {
  return (
    <div className={styles.overview}>
      <section className={styles.intro} aria-labelledby="getting-started-intro">
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>Before you install</p>
          <h2 id="getting-started-intro">Homarr is the front door to your self-hosted stack.</h2>
          <p>
            It can be a clean page of shortcuts, a live view of connected services, or both. You build boards in the
            browser; YAML is not part of the normal configuration flow.
          </p>
          <Link to="/docs/getting-started/installation/docker">
            Docker installation <IconArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.summary}>
          <SummaryItem icon={IconServer} label="Your services" />
          <span aria-hidden="true" />
          <SummaryItem icon={IconPlugConnected} label="Connections" />
          <span aria-hidden="true" />
          <SummaryItem icon={IconSparkles} label="Live widgets" />
          <span aria-hidden="true" />
          <SummaryItem icon={IconLayoutBoard} label="Boards" />
        </div>
      </section>

      <HomarrModel compact />
    </div>
  );
}

const installationPaths = [
  {
    eyebrow: "Recommended",
    title: "Docker Compose",
    description: "General-purpose deployment with a persistent appdata volume.",
    href: "/docs/getting-started/installation/docker",
    recommended: true,
  },
  {
    eyebrow: "Kubernetes",
    title: "Helm",
    description: "Deploy Homarr into an existing cluster.",
    href: "/docs/getting-started/installation/helm",
    recommended: false,
  },
  {
    eyebrow: "Platforms",
    title: "NAS and hosting guides",
    description: "Unraid, TrueNAS, Synology, Portainer, Proxmox, and more.",
    href: "/docs/category/installation-1",
    recommended: false,
  },
];

export function InstallationPaths() {
  return (
    <div className={styles.installPaths}>
      {installationPaths.map((path) => {
        let className = styles.installPath;
        if (path.recommended) className = `${className} ${styles.recommendedPath}`;

        return (
          <Link className={className} to={path.href} key={path.href}>
            <span>{path.eyebrow}</span>
            <strong>{path.title}</strong>
            <small>{path.description}</small>
            <IconArrowRight size={16} aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}

function SummaryItem({ icon: Icon, label }: { icon: typeof IconServer; label: string }) {
  return (
    <div className={styles.summaryItem}>
      <Icon size={18} aria-hidden="true" />
      <strong>{label}</strong>
    </div>
  );
}

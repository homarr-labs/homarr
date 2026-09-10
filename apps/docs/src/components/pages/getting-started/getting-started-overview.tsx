import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import addItem from "@site/docs/getting-started/img/manage-board-header-choose-item.png";
import moveItem from "@site/docs/getting-started/img/move-item.gif";
import resizeItem from "@site/docs/getting-started/img/resize-item.gif";

import { ConceptFlow } from "./concept-flow";
import styles from "./getting-started-overview.module.css";

const editingSteps = [
  {
    title: "Add",
    description: "Choose an app, widget, or container.",
    image: addItem,
    alt: "Add item menu in board edit mode",
    fit: "cover",
  },
  {
    title: "Move",
    description: "Drag the item to another grid position.",
    image: moveItem,
    alt: "Dragging an app tile on a board",
    fit: "contain",
  },
  {
    title: "Resize",
    description: "Drag the resize handle to change its grid area.",
    image: resizeItem,
    alt: "Resizing an app tile on a board",
    fit: "contain",
  },
];

export function GettingStartedOverview() {
  return (
    <div className={styles.overview}>
      <section className={styles.conceptCard} aria-labelledby="getting-started-overview-title">
        <div className={styles.intro}>
          <h2 id="getting-started-overview-title">How Homarr works</h2>
          <p>Services expose data, integrations connect to them, widgets use the data, and boards arrange the widgets.</p>
        </div>

        <ConceptFlow />
      </section>

      <section className={styles.editor} aria-labelledby="board-editor-title">
        <div className={styles.editorHeading}>
          <div>
            <h3 id="board-editor-title">Board edit mode</h3>
            <p>Add items, move them, and resize them on the grid. Each viewport can have its own layout.</p>
          </div>
          <Link href="/docs/management/boards">
            Board docs <IconArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <ol className={styles.editorSteps}>
          {editingSteps.map((step, index) => (
            <li className={styles.editorStep} key={step.title}>
              <div className={styles.stepCopy}>
                <span>{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </div>
              </div>
              <div className={styles.stepMedia}>
                <img src={step.image.src} alt={step.alt} data-fit={step.fit} loading="lazy" />
              </div>
            </li>
          ))}
        </ol>
      </section>
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
    href: "/docs/getting-started/installation",
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
          <Link className={className} href={path.href} key={path.href}>
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

import Link from "@docusaurus/Link";
import { IconArrowRight } from "@tabler/icons-react";

import addItem from "@site/docs/getting-started/img/manage-board-header-choose-item.png";
import moveItem from "@site/docs/getting-started/img/move-item.gif";
import resizeItem from "@site/docs/getting-started/img/resize-item.gif";

import { AssistantFlowDiagram, WorkshopFlowDiagram } from "../core-concepts/technical-diagrams";
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
    <section className={styles.overview} aria-labelledby="getting-started-overview-title">
      <header className={styles.intro}>
        <h2 id="getting-started-overview-title">How Homarr works</h2>
        <p>Services expose data, integrations connect to them, widgets use the data, and boards arrange the widgets.</p>
      </header>

      <ConceptFlow />

      <section className={styles.editor} aria-labelledby="board-editor-title">
        <div className={styles.editorHeading}>
          <div>
            <h3 id="board-editor-title">Board edit mode</h3>
            <p>Add items, move them, and resize them on the grid. Each viewport can have its own layout.</p>
          </div>
          <Link to="/docs/management/boards">
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
                <img src={step.image} alt={step.alt} data-fit={step.fit} loading="lazy" />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.extendedConcepts} aria-labelledby="extended-concepts-title">
        <header className={styles.extendedIntro}>
          <h2 id="extended-concepts-title">Assistant, providers, and Workshop</h2>
          <p>Optional systems that sit beside the board, integration, and widget model.</p>
        </header>

        <section className={styles.extendedConcept} aria-labelledby="assistant-concept-title">
          <div className={styles.extendedHeading}>
            <div>
              <h3 id="assistant-concept-title">Assistant and providers</h3>
              <p>The provider selects the model API. Homarr still owns context, permissions, approvals, and tools.</p>
            </div>
            <div className={styles.extendedLinks}>
              <Link to="/docs/management/assistant">
                Assistant <IconArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link to="/docs/workshop/homarr-provider">
                Homarr provider <IconArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <AssistantFlowDiagram />
        </section>

        <section className={styles.extendedConcept} aria-labelledby="workshop-concept-title">
          <div className={styles.extendedHeading}>
            <div>
              <h3 id="workshop-concept-title">Community Workshop</h3>
              <p>Shareable Custom Widget and CSS definitions move through Workshop; deployment values stay local.</p>
            </div>
            <div className={styles.extendedLinks}>
              <Link to="/docs/workshop">
                Workshop <IconArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <WorkshopFlowDiagram />
        </section>
      </section>
    </section>
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

import Link from "@docusaurus/Link";
import { useColorMode } from "@docusaurus/theme-common";
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDownload,
  IconExternalLink,
  IconGripVertical,
  IconLayoutBoard,
  IconLock,
  IconPalette,
  IconServer,
  IconUsers,
} from "@tabler/icons-react";
import { integrationKinds, widgetKinds } from "@homarr/definitions";

import { supportedIntegrations } from "@site/src/constants/supported-integrations";

import videoDark from "./drag-and-drop/showcase-dark.mp4";
import videoLight from "./drag-and-drop/showcase-light.mp4";
import styles from "./home-page.module.css";
import { HomarrModel } from "./homarr-model";

const previewApps = ["Jellyfin", "Homeassistant", "PiHole"]
  .map((name) => supportedIntegrations.find((integration) => integration.name === name))
  .filter((integration) => integration !== undefined);

const integrationLogos = supportedIntegrations.filter((integration) => integration.name !== "Homarr").slice(0, 12);

export function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <IconServer size={16} aria-hidden="true" />
              Self-hosted dashboard
            </p>
            <h1 className={styles.heroTitle}>
              Your services.
              <span>One operational view.</span>
            </h1>
            <p className={styles.heroDescription}>
              Homarr turns shortcuts, service APIs, and server data into boards you arrange in the browser. Open an app,
              check its state, or act on it without jumping between tabs.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} to="/docs/getting-started">
                Install Homarr
                <IconDownload size={18} aria-hidden="true" />
              </Link>
              <Link
                className={styles.secondaryAction}
                to="https://demo.homarr.dev/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open the demo
                <IconExternalLink size={17} aria-hidden="true" />
              </Link>
            </div>
            <ul className={styles.heroFacts} aria-label="Homarr at a glance">
              <li>
                <IconCheck size={15} aria-hidden="true" /> Configured in the UI
              </li>
              <li>
                <IconCheck size={15} aria-hidden="true" /> Responsive boards
              </li>
              <li>
                <IconCheck size={15} aria-hidden="true" /> Your server, your data
              </li>
            </ul>
          </div>
          <BoardPreview />
        </div>
      </section>

      <section className={styles.modelSection}>
        <HomarrModel />
      </section>

      <section className={styles.valueSection} aria-labelledby="value-heading">
        <SectionHeading
          eyebrow="Why Homarr"
          title="A dashboard that works like your stack"
          description="Start with a few links. Add live data and controls when they are useful. The same board can stay simple or grow with your server."
          id="value-heading"
        />
        <div className={styles.bentoGrid}>
          <VisualEditorCard />
          <IntegrationCard />
          <ResponsiveCard />
          <AccessCard />
        </div>
      </section>

      <section className={styles.startSection} aria-labelledby="start-heading">
        <div className={styles.startCopy}>
          <p className={styles.eyebrow}>Start small</p>
          <h2 id="start-heading">One board is enough.</h2>
          <p>Install Homarr, add the services you use most, then shape the board as your stack changes.</p>
        </div>
        <ol className={styles.startSteps}>
          <li>
            <span>01</span>
            <div>
              <strong>Run Homarr</strong>
              <p>Docker Compose is the shortest general-purpose path.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Connect your stack</strong>
              <p>Add shortcuts first; integrations are optional.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Build the board</strong>
              <p>Place apps and widgets, then adjust each layout.</p>
            </div>
          </li>
        </ol>
        <Link className={styles.startAction} to="/docs/getting-started">
          Get started <IconArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  id,
}: {
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function BoardPreview() {
  return (
    <div className={styles.boardShell} role="img" aria-label="Example Homarr board with app and status widgets">
      <div className={styles.boardChrome}>
        <div className={styles.windowControls} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className={styles.boardAddress}>home.lab</span>
        <span className={styles.liveIndicator}>Live</span>
      </div>
      <div className={styles.boardCanvas}>
        <div className={styles.boardHeader}>
          <div>
            <span className={styles.boardKicker}>Tuesday · 08:42</span>
            <strong>Good morning.</strong>
          </div>
          <span className={styles.editPill}>
            <IconGripVertical size={14} aria-hidden="true" /> Edit board
          </span>
        </div>
        <div className={styles.boardGrid}>
          <div className={styles.appCluster}>
            {previewApps.map((app) => (
              <div className={styles.appTile} key={app.name}>
                <img src={app.iconUrl} alt="" />
                <span>{app.name === "Homeassistant" ? "Home Assistant" : app.name}</span>
                <i aria-hidden="true" />
              </div>
            ))}
          </div>
          <div className={styles.resourceWidget}>
            <div className={styles.widgetTitle}>
              <span>
                <IconServer size={15} aria-hidden="true" /> Server
              </span>
              <small>Online</small>
            </div>
            <ResourceBar label="CPU" value="34%" width="34%" />
            <ResourceBar label="Memory" value="62%" width="62%" />
            <ResourceBar label="Storage" value="78%" width="78%" />
          </div>
          <div className={styles.queueWidget}>
            <div className={styles.widgetTitle}>
              <span>
                <IconBolt size={15} aria-hidden="true" /> Downloads
              </span>
              <small>2 active</small>
            </div>
            <QueueRow name="photos-backup.zip" progress="72%" />
            <QueueRow name="media-library.mkv" progress="38%" />
          </div>
          <div className={styles.statusWidget}>
            <span className={styles.statusPulse} aria-hidden="true" />
            <div>
              <strong>All core services online</strong>
              <small>Checked a few seconds ago</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceBar({ label, value, width }: { label: string; value: string; width: string }) {
  return (
    <div className={styles.resourceRow}>
      <div>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <i>
        <b style={{ width }} />
      </i>
    </div>
  );
}

function QueueRow({ name, progress }: { name: string; progress: string }) {
  return (
    <div className={styles.queueRow}>
      <span>{name}</span>
      <i>
        <b style={{ width: progress }} />
      </i>
    </div>
  );
}

function VisualEditorCard() {
  const { colorMode } = useColorMode();
  let video = videoLight;
  if (colorMode === "dark") video = videoDark;

  return (
    <article className={`${styles.bentoCard} ${styles.editorCard}`}>
      <div className={styles.cardCopy}>
        <span className={styles.cardIcon}>
          <IconLayoutBoard size={20} aria-hidden="true" />
        </span>
        <p className={styles.cardLabel}>Visual editor</p>
        <h3>Arrange it in the browser</h3>
        <p>Move, resize, group, and configure items directly on the board. Each viewport can have its own layout.</p>
      </div>
      <div className={styles.videoFrame}>
        <video src={video} autoPlay loop muted playsInline aria-label="Editing a Homarr board by drag and drop">
          <track
            default
            kind="captions"
            src="/captions/board-editor-en.vtt"
            srcLang="en"
            label="Board editing description"
          />
        </video>
      </div>
    </article>
  );
}

function IntegrationCard() {
  return (
    <article className={`${styles.bentoCard} ${styles.integrationCard}`}>
      <div className={styles.cardCopy}>
        <span className={styles.cardIcon}>
          <IconBolt size={20} aria-hidden="true" />
        </span>
        <p className={styles.cardLabel}>Live data</p>
        <h3>Connect once</h3>
        <p>
          {integrationKinds.length} integrations feed {widgetKinds.length} widgets with service data and actions.
        </p>
        <Link to="/docs/category/integrations">
          Browse integrations <IconArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.logoCloud} role="list" aria-label="Examples of supported integrations">
        {[...integrationLogos, ...integrationLogos].map((integration, index) => (
          <span key={`${integration.name}-${index}`} role="listitem" aria-hidden={index >= integrationLogos.length}>
            <img src={integration.iconUrl} alt={index < integrationLogos.length ? integration.name : ""} />
          </span>
        ))}
      </div>
    </article>
  );
}

function ResponsiveCard() {
  return (
    <article className={`${styles.bentoCard} ${styles.responsiveCard}`}>
      <div className={styles.cardCopy}>
        <span className={styles.cardIcon}>
          <IconDeviceDesktop size={20} aria-hidden="true" />
        </span>
        <p className={styles.cardLabel}>Responsive by design</p>
        <h3>One board, every screen</h3>
        <p>Keep separate Mobile, Base, and custom layouts without duplicating the board.</p>
      </div>
      <div className={styles.deviceScene} aria-hidden="true">
        <div className={styles.desktopDevice}>
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
        <div className={styles.mobileDevice}>
          <IconDeviceMobile size={14} />
          <div />
          <div />
          <div />
        </div>
      </div>
    </article>
  );
}

function AccessCard() {
  return (
    <article className={`${styles.bentoCard} ${styles.accessCard}`}>
      <div className={styles.cardCopy}>
        <span className={styles.cardIcon}>
          <IconUsers size={20} aria-hidden="true" />
        </span>
        <p className={styles.cardLabel}>Built for more than one user</p>
        <h3>Share the right view</h3>
        <p>Use public or private boards, groups, and resource access when your dashboard is shared.</p>
      </div>
      <div className={styles.accessVisual} aria-hidden="true">
        <span className={styles.avatar}>A</span>
        <span className={styles.avatar}>J</span>
        <span className={styles.avatar}>M</span>
        <span className={styles.accessLine} />
        <span className={styles.permissionPill}>
          <IconLock size={13} /> Board access
        </span>
        <span className={styles.permissionPill}>
          <IconPalette size={13} /> Own layout
        </span>
      </div>
    </article>
  );
}

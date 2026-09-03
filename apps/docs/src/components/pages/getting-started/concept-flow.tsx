import type { ReactNode } from "react";

import Link from "@docusaurus/Link";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconDownload,
  IconGripVertical,
  IconLayoutBoard,
  IconPlugConnected,
} from "@tabler/icons-react";

import { qBittorentIntegration } from "@site/docs/integrations/q-bittorent";
import { sonarrIntegration } from "@site/docs/integrations/sonarr";

import styles from "./concept-flow.module.css";

const services = [
  {
    name: sonarrIntegration.name,
    iconUrl: getIconUrl(sonarrIntegration.iconUrl),
    endpoint: "sonarr:8989",
    href: "/docs/integrations/sonarr",
  },
  {
    name: qBittorentIntegration.name,
    iconUrl: getIconUrl(qBittorentIntegration.iconUrl),
    endpoint: "qbittorrent:8080",
    href: "/docs/integrations/q-bittorent",
  },
];

const widgets = [
  {
    name: "Calendar",
    icon: IconCalendarEvent,
    href: "/docs/widgets/calendar",
  },
  {
    name: "Downloads",
    icon: IconDownload,
    href: "/docs/widgets/downloads",
  },
];

function getIconUrl(iconUrl: typeof sonarrIntegration.iconUrl) {
  if (typeof iconUrl === "string") return iconUrl;
  return iconUrl.light;
}

export function ConceptFlow() {
  return (
    <figure className={styles.diagram} aria-label="How Homarr connects services to a board">
      <div className={styles.lane}>
        <Stage number="1" title="Service" detail="API endpoint">
          <div className={styles.serviceList}>
            {services.map((service) => (
              <Link className={styles.service} to={service.href} key={service.name}>
                <img src={service.iconUrl} alt="" />
                <span>
                  <strong>{service.name}</strong>
                  <code>{service.endpoint}</code>
                </span>
              </Link>
            ))}
          </div>
        </Stage>

        <FlowArrow />

        <Stage number="2" title="Integration" detail="Server-side connection" href="/docs/management/integrations">
          <div className={styles.integration}>
            <IconPlugConnected size={26} aria-hidden="true" />
            <code>URL + credentials</code>
            <span>Fetch data and run actions</span>
          </div>
        </Stage>

        <FlowArrow />

        <Stage number="3" title="Widget" detail="Data and actions" href="/docs/category/widgets">
          <div className={styles.widgetList}>
            {widgets.map((widget) => {
              const Icon = widget.icon;
              return (
                <Link className={styles.widget} to={widget.href} key={widget.name}>
                  <Icon size={17} aria-hidden="true" />
                  <span>{widget.name}</span>
                </Link>
              );
            })}
          </div>
        </Stage>

        <FlowArrow />

        <Stage number="4" title="Board" detail="Placed in the grid" href="/docs/management/boards">
          <div className={styles.board} aria-hidden="true">
            <span className={styles.boardTile}>
              <IconCalendarEvent size={14} />
              Calendar
              <IconGripVertical size={13} />
            </span>
            <span className={`${styles.boardTile} ${styles.boardTileWide}`}>
              <IconDownload size={14} />
              Downloads
              <IconGripVertical size={13} />
            </span>
          </div>
        </Stage>
      </div>
    </figure>
  );
}

function Stage({
  number,
  title,
  detail,
  href,
  children,
}: {
  number: string;
  title: string;
  detail: string;
  href?: string;
  children: ReactNode;
}) {
  const heading = (
    <>
      <span className={styles.stageNumber}>{number}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </>
  );

  return (
    <section className={styles.stage}>
      {href ? (
        <Link className={styles.stageHeading} to={href}>
          {heading}
        </Link>
      ) : (
        <div className={styles.stageHeading}>{heading}</div>
      )}
      {children}
    </section>
  );
}

function FlowArrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      <IconArrowRight size={20} stroke={2.5} />
    </span>
  );
}

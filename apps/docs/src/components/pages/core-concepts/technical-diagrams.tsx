import type { ReactNode } from "react";

import Link from "@docusaurus/Link";
import {
  IconApi,
  IconArrowDown,
  IconArrowRight,
  IconBox,
  IconBraces,
  IconBrowser,
  IconBuildingStore,
  IconCode,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconKey,
  IconLayoutBoard,
  IconMessages,
  IconPlugConnected,
  IconRobot,
  IconServer,
  IconShieldCheck,
  IconTool,
  IconUser,
  IconWorld,
} from "@tabler/icons-react";

import { sonarrIntegration } from "@site/docs/integrations/sonarr";

import styles from "./technical-diagrams.module.css";

const sonarrIconUrl = getIconUrl(sonarrIntegration.iconUrl);

export function AppFlowDiagram() {
  return (
    <figure className={styles.diagram} aria-label="How an app record is used on a board">
      <div className={styles.threeStepLane}>
        <DiagramNode icon={<IconBox size={19} />} title="App record" detail="Saved once in Homarr">
          <div className={styles.pillList}>
            <span>Name</span>
            <span>Icon</span>
            <span>URL</span>
            <span>Ping URL · optional</span>
          </div>
        </DiagramNode>
        <FlowArrow label="place" />
        <DiagramNode icon={<IconLayoutBoard size={19} />} title="Board" detail="App tile or Bookmarks widget" />
        <FlowArrow label="click" />
        <DiagramNode icon={<IconBrowser size={19} />} title="Browser" detail="Opens the app URL directly" />
      </div>

      <DiagramNote>
        If a Ping URL is set, the Homarr server checks that address for status. Clicking the tile still opens the app
        URL.
      </DiagramNote>
    </figure>
  );
}

export function IntegrationRoutesDiagram() {
  return (
    <figure className={styles.diagram} aria-label="Browser and server routes from Homarr to Sonarr">
      <div className={styles.routeBlock}>
        <RouteHeading icon={<IconBrowser size={16} />} title="Open the service" detail="Browser route" />
        <div className={styles.threeStepLane}>
          <DiagramNode icon={<IconLayoutBoard size={19} />} title="App tile" detail="Click from a board" />
          <FlowArrow label="opens" />
          <DiagramNode icon={<IconWorld size={19} />} title="App URL" detail="Browser-facing address">
            <code>https://sonarr.example.com</code>
          </DiagramNode>
          <FlowArrow />
          <DiagramNode
            icon={<img src={sonarrIconUrl} alt="" />}
            title="Sonarr UI"
            detail="The browser connects directly"
            href="/docs/integrations/sonarr"
          />
        </div>
      </div>

      <div className={styles.routeBlock}>
        <RouteHeading icon={<IconServer size={16} />} title="Use service data" detail="Server route" />
        <div className={styles.threeStepLane}>
          <DiagramNode icon={<IconApi size={19} />} title="Widget" detail="Requests data or an action" />
          <FlowArrow label="Homarr" />
          <DiagramNode
            icon={<IconPlugConnected size={19} />}
            title="Integration"
            detail="URL and encrypted credentials"
            href="/docs/management/integrations"
          >
            <code>http://sonarr:8989</code>
          </DiagramNode>
          <FlowArrow label="API" />
          <DiagramNode
            icon={<img src={sonarrIconUrl} alt="" />}
            title="Sonarr API"
            detail="The Homarr server connects"
            href="/docs/integrations/sonarr"
          />
        </div>
      </div>

      <DiagramNote>
        Linking the app to the integration gives integration-backed widgets the browser-facing destination.
      </DiagramNote>
    </figure>
  );
}

export function BoardLayoutsDiagram() {
  return (
    <figure className={styles.diagram} aria-label="How one board selects independent responsive layouts">
      <div className={styles.boardSource}>
        <span className={styles.largeIcon}>
          <IconLayoutBoard size={23} aria-hidden="true" />
        </span>
        <span>
          <strong>One board</strong>
          <small>The same apps, widgets, and Containers</small>
        </span>
      </div>

      <div className={styles.branchSelector} aria-hidden="true">
        <span>highest matching breakpoint</span>
        <IconArrowDown size={18} />
      </div>

      <div className={styles.layoutGrid}>
        <LayoutCard
          icon={<IconDeviceMobile size={18} />}
          title="Mobile"
          range="starts at 0px"
          detail="Own positions · no rails"
          variant="mobile"
        />
        <LayoutCard
          icon={<IconDeviceDesktop size={18} />}
          title="Base"
          range="starts at 768px"
          detail="Own positions · rails available"
          variant="base"
        />
        <LayoutCard
          icon={<IconLayoutBoard size={18} />}
          title="Custom"
          range="unique breakpoint"
          detail="Own positions · rails available"
          variant="custom"
        />
      </div>

      <DiagramNote>Moving or resizing an item in one layout does not change its coordinates in the others.</DiagramNote>
    </figure>
  );
}

export function AssistantFlowDiagram() {
  return (
    <figure className={styles.diagram} aria-label="How Homarr Assistant uses a model provider and Homarr tools">
      <div className={styles.routeBlock}>
        <RouteHeading icon={<IconMessages size={16} />} title="Conversation" detail="Every request" />
        <div className={styles.threeStepLane}>
          <DiagramNode icon={<IconUser size={19} />} title="You" detail="Prompt, attachment, or @ reference" />
          <FlowArrow />
          <DiagramNode
            icon={<IconRobot size={19} />}
            title="Assistant server"
            detail="Loads live context and tool definitions"
          />
          <FlowArrow />
          <DiagramNode
            icon={<IconWorld size={19} />}
            title="Provider + model"
            detail="Instance-wide provider; model may vary by conversation"
          >
            <div className={styles.pillList}>
              <Link to="/docs/workshop/homarr-provider">Homarr</Link>
              <span>Hosted</span>
              <span>Local</span>
              <span>Custom</span>
            </div>
          </DiagramNode>
        </div>
      </div>

      <div className={styles.routeBlock}>
        <RouteHeading icon={<IconTool size={16} />} title="When the model calls a tool" detail="Only when needed" />
        <div className={styles.threeStepLane}>
          <DiagramNode icon={<IconTool size={19} />} title="Tool request" detail="Read data or make a change" />
          <FlowArrow />
          <DiagramNode
            icon={<IconShieldCheck size={19} />}
            title="Permission boundary"
            detail="Current user; approval for changes by default"
          />
          <FlowArrow />
          <DiagramNode
            icon={<IconLayoutBoard size={19} />}
            title="Homarr resources"
            detail="Boards · apps · integrations · widgets · services"
            href="/docs/management/mcp"
          />
        </div>
      </div>

      <DiagramNote>
        Tool results return to the model; the final answer streams back to the same conversation. The Homarr provider
        routes model requests through Workshop. Other providers connect directly from the Homarr server.
      </DiagramNote>
    </figure>
  );
}

export function HomarrProviderDiagram() {
  return (
    <figure className={styles.diagram} aria-label="How the Homarr Assistant provider routes model requests">
      <div className={styles.fourStepLane}>
        <DiagramNode icon={<IconMessages size={19} />} title="Assistant" detail="Per-user conversation" />
        <FlowArrow label="request" />
        <DiagramNode icon={<IconServer size={19} />} title="Homarr server" detail="Context, permissions, and tools" />
        <FlowArrow label="token" />
        <DiagramNode
          icon={<IconBuildingStore size={19} />}
          title="Workshop provider"
          detail="Quota and homarr/model routing"
          href="/docs/workshop"
        />
        <FlowArrow label="model" />
        <DiagramNode icon={<IconWorld size={19} />} title="Upstream model" detail="OpenRouter-compatible endpoint" />
      </div>

      <div className={styles.factList}>
        <span>
          <IconKey size={15} aria-hidden="true" /> No administrator API key
        </span>
        <span>
          <IconApi size={15} aria-hidden="true" /> 50 request units per user and UTC day
        </span>
        <span>
          <IconShieldCheck size={15} aria-hidden="true" /> Workshop does not store prompts or responses
        </span>
      </div>

      <DiagramNote>
        Tool calls still execute inside your Homarr instance with the signed-in user's permissions.
      </DiagramNote>
    </figure>
  );
}

export function WorkshopFlowDiagram() {
  return (
    <figure className={styles.diagram} aria-label="How content moves through the Community Workshop">
      <div className={styles.fourStepLane}>
        <DiagramNode icon={<IconCode size={19} />} title="Author" detail="Build shareable content">
          <div className={styles.pillList}>
            <span>Custom Widget JSON</span>
            <span>Custom CSS</span>
          </div>
        </DiagramNode>
        <FlowArrow label="publish" />
        <DiagramNode
          icon={<IconBuildingStore size={19} />}
          title="Workshop"
          detail="Source, screenshots, and revision"
          href="pathname:///workshop"
        />
        <FlowArrow label="inspect" />
        <DiagramNode
          icon={<IconShieldCheck size={19} />}
          title="Review + import"
          detail="Validate source and requested access"
        />
        <FlowArrow label="local" />
        <DiagramNode icon={<IconLayoutBoard size={19} />} title="Your Homarr" detail="Configure and place on a board">
          <div className={styles.localDetails}>
            <span>Widget → local URLs + secrets</span>
            <span>CSS → board custom CSS</span>
          </div>
        </DiagramNode>
      </div>

      <DiagramNote>
        Workshop stores the shareable definition. Instance-specific URLs and credentials stay local.
      </DiagramNote>
    </figure>
  );
}

export function CustomWidgetFlowDiagram() {
  return (
    <figure className={styles.diagram} aria-label="How a Custom Widget definition becomes a board tile">
      <div className={styles.threeStepLane}>
        <DiagramNode
          icon={<IconBraces size={19} />}
          title="Widget definition"
          detail="homarr-custom-widget-v2"
          href="/docs/management/custom-widgets/authoring"
        >
          <div className={styles.definitionParts}>
            <span>
              <IconApi size={14} /> API sources
            </span>
            <span>
              <IconTool size={14} /> Queries + actions
            </span>
            <span>
              <IconCode size={14} /> Safe JSX
            </span>
          </div>
        </DiagramNode>
        <FlowArrow label="validate" />
        <DiagramNode
          icon={<IconServer size={19} />}
          title="Homarr runtime"
          detail="Requests on the server; JSX in a restricted renderer"
          href="/docs/management/custom-widgets/requests-and-security"
        />
        <FlowArrow label="render" />
        <DiagramNode icon={<IconLayoutBoard size={19} />} title="Board tile" detail="Live data and declared actions" />
      </div>

      <DiagramNote>
        Source credentials are stored separately and excluded from exports, prompts, and Workshop submissions.
      </DiagramNote>
    </figure>
  );
}

function RouteHeading({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className={styles.routeHeading}>
      <span>{icon}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
  );
}

function DiagramNode({
  icon,
  title,
  detail,
  href,
  children,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  href?: string;
  children?: ReactNode;
}) {
  const content = (
    <>
      <div className={styles.nodeHeader}>
        <span className={styles.nodeIcon}>{icon}</span>
        <span className={styles.nodeCopy}>
          <strong>{title}</strong>
          <small>{detail}</small>
        </span>
      </div>
      {children && <div className={styles.nodeBody}>{children}</div>}
    </>
  );

  if (href) {
    return (
      <Link className={`${styles.node} ${styles.nodeLink}`} to={href}>
        {content}
      </Link>
    );
  }

  return <div className={styles.node}>{content}</div>;
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <span className={styles.flowArrow}>
      {label && <small>{label}</small>}
      {!label && <span className={styles.visuallyHidden}>then</span>}
      <span className={styles.arrowLine} aria-hidden="true">
        <IconArrowRight size={18} stroke={2.5} />
      </span>
    </span>
  );
}

function LayoutCard({
  icon,
  title,
  range,
  detail,
  variant,
}: {
  icon: ReactNode;
  title: string;
  range: string;
  detail: string;
  variant: "mobile" | "base" | "custom";
}) {
  return (
    <section className={styles.layoutCard}>
      <div className={styles.layoutHeading}>
        <span>{icon}</span>
        <span>
          <strong>{title}</strong>
          <code>{range}</code>
        </span>
      </div>
      <MiniBoard variant={variant} />
      <small>{detail}</small>
    </section>
  );
}

function MiniBoard({ variant }: { variant: "mobile" | "base" | "custom" }) {
  let className = styles.miniBoard;
  className = `${className} ${styles[`${variant}Board`]}`;

  return (
    <div className={className} aria-hidden="true">
      <span className={styles.miniRail} />
      <span className={styles.miniTile} />
      <span className={styles.miniTile} />
      <span className={styles.miniTile} />
      <span className={styles.miniTile} />
    </div>
  );
}

function DiagramNote({ children }: { children: ReactNode }) {
  return <figcaption className={styles.diagramNote}>{children}</figcaption>;
}

function getIconUrl(iconUrl: typeof sonarrIntegration.iconUrl) {
  if (typeof iconUrl === "string") return iconUrl;
  return iconUrl.light;
}

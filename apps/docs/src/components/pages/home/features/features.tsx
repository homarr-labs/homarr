import {
  IconAdjustments,
  IconDragDrop,
  IconIcons,
  IconKey,
  IconLanguage,
  IconPlug,
  type TablerIcon,
} from "@tabler/icons-react";

interface Feature {
  icon: TablerIcon;
  title: string;
  content: string;
}

const featureList: Feature[] = [
  {
    icon: IconDragDrop,
    title: "Build boards with drag and drop",
    content: "Arrange apps and widgets with a mouse or a finger.",
  },
  {
    icon: IconIcons,
    title: "Thousands of built-in icons",
    content: "Choose icons from the repositories included with Homarr.",
  },
  {
    icon: IconPlug,
    title: "Connect the services you run",
    content: "See status, activity, and controls from supported apps directly on the dashboard.",
  },
  {
    icon: IconKey,
    title: "Authentication and permissions included",
    content: "Use credentials, OIDC, or LDAP and decide precisely what each user can see and manage.",
  },
  {
    icon: IconLanguage,
    title: "Available in 26 languages",
    content: "Select one of 26 available interface languages.",
  },
  {
    icon: IconAdjustments,
    title: "Fine-grained customization",
    content: "Configure boards, apps, and widgets from the interface.",
  },
];

function FeatureComponent(props: Feature) {
  return (
    <article className="grid grid-cols-[2.75rem_1fr] gap-4 border-t py-7 first:border-t-0 sm:first:border-t lg:[&:nth-child(-n+2)]:border-t-0 lg:[&:nth-child(odd)]:pr-8 lg:[&:nth-child(even)]:border-l lg:[&:nth-child(even)]:pl-8">
      <div className="flex size-11 items-center justify-center rounded-lg bg-fd-primary/10 text-fd-primary">
        <props.icon aria-hidden="true" size={24} stroke={1.8} />
      </div>
      <div>
        <h2 className="m-0 text-lg font-semibold tracking-tight text-fd-foreground">{props.title}</h2>
        <p className="mb-0 mt-2 text-sm leading-6 text-fd-muted-foreground">{props.content}</p>
      </div>
    </article>
  );
}

export default function HomepageFeatures() {
  return (
    <section className="mb-20 mt-4 lg:mb-24" aria-label="Homarr features">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {featureList.map((props) => (
          <FeatureComponent key={props.title} {...props} />
        ))}
      </div>
    </section>
  );
}

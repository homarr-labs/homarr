"use client";

import { Tab, Tabs as FumadocsTabs, TabsList, TabsTrigger } from "fumadocs-ui/components/tabs";
import { Children, isValidElement, useRef, type ReactElement, type ReactNode } from "react";

import { track } from "@/lib/analytics";

interface TabItemProps {
  children: ReactNode;
  className?: string;
  default?: boolean;
  label: ReactNode;
  value: string;
}

export function TabItem({ children }: TabItemProps) {
  return children;
}

export function Tabs({ children, className }: { children: ReactNode; className?: string }) {
  const tabs = Children.toArray(children).filter(isValidElement) as ReactElement<TabItemProps>[];
  const defaultValue = tabs.find((tab) => tab.props.default)?.props.value ?? tabs[0]?.props.value;
  const lastTracked = useRef<string | null>(defaultValue ?? null);

  const report = (value: string) => {
    if (value === lastTracked.current) return;
    lastTracked.current = value;
    track("Tab Switched", { tab: value });
  };

  return (
    <FumadocsTabs className={className} defaultValue={defaultValue}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.props.value}
            value={tab.props.value}
            onClick={() => report(tab.props.value)}
            onFocus={(event) => {
              if (event.currentTarget.matches(":focus-visible")) report(tab.props.value);
            }}
          >
            {tab.props.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <Tab key={tab.props.value} value={tab.props.value} className={tab.props.className}>
          {tab.props.children}
        </Tab>
      ))}
    </FumadocsTabs>
  );
}

export default Tabs;

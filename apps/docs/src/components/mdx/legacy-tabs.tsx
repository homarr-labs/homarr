"use client";

import { Tab, Tabs as FumadocsTabs, TabsList, TabsTrigger } from "fumadocs-ui/components/tabs";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

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

  return (
    <FumadocsTabs className={className} defaultValue={defaultValue}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.props.value} value={tab.props.value}>
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

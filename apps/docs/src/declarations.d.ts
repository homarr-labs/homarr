declare module "*.mp4" {
  const src: string;
  export default src;
}

declare module "@theme/Tabs" {
  import type { ComponentProps, ReactNode } from "react";
  interface Props extends ComponentProps<"div"> {
    children: ReactNode;
    className?: string;
  }
  export default function Tabs(props: Props): JSX.Element;
}

declare module "@theme/TabItem" {
  import type { ReactNode } from "react";
  interface Props {
    children: ReactNode;
    value: string;
    label?: ReactNode;
    className?: string;
    key?: string;
  }
  export default function TabItem(props: Props): JSX.Element;
}

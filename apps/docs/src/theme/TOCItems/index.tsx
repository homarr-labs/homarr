import type { WrapperProps } from "@docusaurus/types";
import { Carbon } from "@site/src/components/carbon";
import TOCItems from "@theme-original/TOCItems";
import type TOCItemsType from "@theme/TOCItems";
import { type ReactNode } from "react";

type Props = WrapperProps<typeof TOCItemsType>;

export default function TOCItemsWrapper(props: Props): ReactNode {
  return (
    <>
      <TOCItems {...props} />
      <Carbon />
    </>
  );
}

import type { WrapperProps } from "@docusaurus/types";
import { Carbon } from "@site/src/components/carbon";
import DocPaginator from "@theme-original/DocPaginator";
import type DocPaginatorType from "@theme/DocPaginator";
import { type ReactNode } from "react";

type Props = WrapperProps<typeof DocPaginatorType>;

export default function DocPaginatorWrapper(props: Props): ReactNode {
  return (
    <>
      <DocPaginator {...props} />
      <div className="max-w-80">
        <Carbon />
      </div>
    </>
  );
}

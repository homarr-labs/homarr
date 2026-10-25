// THROWAWAY PROTOTYPE: compare three ways to inspect targeted board sanity evidence.
import { notFound } from "next/navigation";

import { SanityWorkbenchPrototype } from "./_prototype";

export const metadata = { title: "Sanity workbench prototype" };

export default function SanityPrototypePage() {
  if (process.env.NODE_ENV === "production" || process.env.HOMARR_SANITY_PROTOTYPE !== "true") notFound();
  return <SanityWorkbenchPrototype />;
}

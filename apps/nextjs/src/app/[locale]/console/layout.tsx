import type { PropsWithChildren } from "react";
import { redirect } from "next/navigation";
import { auth } from "@homarr/auth/next";
import { PabloConsoleFrame } from "~/components/pablo-console/frame";
import homeBoardDefinition from "../boards/(content)/(home)/_definition";

interface Props extends PropsWithChildren {
  params: Promise<{ locale: string }>;
}

// Requires authentication even when the home board itself is public.
// Homarr's own board permissions continue to apply to the embedded board.
export default async function PabloConsoleLayout({ children, params }: Props) {
  const session = await auth();
  if (!session) redirect("/auth/login?callbackUrl=%2Fconsole");

  const HomeBoardLayout = homeBoardDefinition.layout;
  return (
    <PabloConsoleFrame>
      <HomeBoardLayout params={params}>{children}</HomeBoardLayout>
    </PabloConsoleFrame>
  );
}

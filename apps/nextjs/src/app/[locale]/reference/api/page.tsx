import { notFound } from "next/navigation";

import { auth } from "@homarr/auth/next";

import { ScalarApiReference } from "~/app/[locale]/manage/tools/api/components/scalar-api-reference";

export default async function ApiReferencePage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) notFound();

  return <ScalarApiReference />;
}

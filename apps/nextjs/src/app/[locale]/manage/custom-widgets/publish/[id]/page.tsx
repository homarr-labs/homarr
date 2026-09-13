import { redirect } from "next/navigation";

import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { WorkshopPublishForm } from "./_workshop-publish-form";

interface WorkshopPublishPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}

export default async function WorkshopPublishPage(props: WorkshopPublishPageProps) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect(session ? "/" : "/auth/login");

  const { id } = await props.params;
  const { kind } = await props.searchParams;
  if (kind === "package") {
    const installation = await api.customWidget.package.get({ id }).catch(catchTrpcNotFound);
    const parsed = customWidgetPackageSchema.safeParse(installation.source);
    let version = parsed.data?.manifest.version ?? "1.0.0";
    if (installation.workshop?.version === version) {
      const [major, minor, patch] = version.split(/[.+-]/u);
      version = `${major}.${minor}.${Number(patch) + 1}`;
    }
    return (
      <WorkshopPublishForm
        kind="package"
        widget={{ id, name: installation.name, description: parsed.data?.manifest.description, version }}
      />
    );
  }
  const definition = await api.customWidget.get({ id }).catch(catchTrpcNotFound);

  return <WorkshopPublishForm widget={{ id, name: definition.name }} />;
}

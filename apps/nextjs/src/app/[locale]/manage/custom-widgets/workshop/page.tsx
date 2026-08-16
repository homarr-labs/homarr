import { redirect } from "next/navigation";
import { z } from "zod/v4";

import { auth } from "@homarr/auth/next";
import type { inferSearchParamsFromSchema } from "@homarr/common/types";

import { WorkshopBrowse } from "./_workshop-browse";

const searchParamsSchema = z.object({
  search: z.string().optional(),
  sort: z.enum(["top", "newest"]).catch("top"),
  page: z
    .string()
    .regex(/^[1-9]\d*$/u)
    .transform(Number)
    .pipe(z.number().int().positive())
    .catch(1),
});

interface WorkshopBrowsePageProps {
  searchParams: Promise<inferSearchParamsFromSchema<typeof searchParamsSchema>>;
}

export default async function WorkshopBrowsePage(props: WorkshopBrowsePageProps) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect(session ? "/" : "/auth/login");

  const { search, sort, page } = searchParamsSchema.parse(await props.searchParams);

  return <WorkshopBrowse search={search?.trim() || undefined} sort={sort} page={page} />;
}

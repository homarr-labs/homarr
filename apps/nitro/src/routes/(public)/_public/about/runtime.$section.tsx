import { Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({ view: z.enum(["summary", "details"]).optional().catch(undefined) });

export const Route = createFileRoute("/(public)/_public/about/runtime/$section")({
  validateSearch: searchSchema,
  loader: ({ params }) => {
    if (params.section !== "foundation") throw notFound();
    return { title: "Runtime foundation" };
  },
  component: RuntimeInformation,
});

function RuntimeInformation() {
  const { title } = Route.useLoaderData();
  const { view = "summary" } = Route.useSearch();
  const { bootstrap } = Route.useRouteContext();
  return (
    <Stack>
      <Title order={2}>{title}</Title>
      <Text>Request-isolated React rendering with typed file routes.</Text>
      <Text data-runtime-view={view}>
        {view === "details"
          ? "Each document owns its Router, QueryClient and public snapshot."
          : "Public SSR is uncached."}
      </Text>
      <Text data-request-id={bootstrap.snapshot.requestId}>Request {bootstrap.snapshot.requestId}</Text>
      <Link
        to="/about/runtime/$section"
        params={{ section: "foundation" }}
        search={{ view: view === "details" ? "summary" : "details" }}
      >
        Switch view
      </Link>
      <Link to="/about/status">Application status</Link>
    </Stack>
  );
}

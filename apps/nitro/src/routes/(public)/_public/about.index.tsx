import { Text } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/_public/about/")({ component: About });

function About() {
  return (
    <>
      <Text>A public, uncached application shell. Authentication, setup and product services remain unavailable.</Text>
      <Link to="/about/runtime/$section" params={{ section: "foundation" }} search={{ view: "details" }}>
        Runtime details
      </Link>
    </>
  );
}

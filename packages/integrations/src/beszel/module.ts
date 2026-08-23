import { defineIntegrationModule } from "@homarr/definitions";

export default defineIntegrationModule({
  kind: "beszel",
  name: "Beszel",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/beszel.svg",
  secretKinds: [["username", "password"]],
  categories: ["beszel"],
  defaultPort: 8090,
  documentation: {
    slug: "beszel",
    sourceDirectory: "docs",
  },
  creator: {
    type: "constructor",
    module: "./beszel-integration",
    exportName: "BeszelIntegration",
  },
});

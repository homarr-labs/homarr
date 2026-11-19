import { WidgetDefinition } from "@site/src/types";
import { IconRocket } from "@tabler/icons-react";

export const releasesWidget: WidgetDefinition = {
  icon: IconRocket,
  name: "Releases",
  description: "Tracks the latest releases of repositories and container images, and shows their changelogs.",
  path: "../../widgets/releases",
  configuration: {
    items: [
      {
        name: "Layout",
        description: "Compact shows every repository on a single line.",
        values: { type: "select", options: ["Comfortable", "Compact"] },
        defaultValue: "Comfortable",
      },
      {
        name: "Summary",
        description:
          "What to show above the list. The status bar adds one segment per repository that jumps to it when clicked.",
        values: { type: "select", options: ["Count and status bar", "Count only", "Hidden"] },
        defaultValue: "Count only",
      },
      {
        name: "Sections",
        description: "Groups of repositories to show. Hidden groups are not listed at all.",
        values: { type: "select", options: ["New", "Needs attention", "Up to date", "Quiet"] },
        defaultValue: "All",
      },
      {
        name: "Highlight new releases for",
        description: "Releases published within this period are listed under New until you mark them as viewed.",
        values: { type: "select", options: ["Never", "1 day", "3 days", "1 week", "2 weeks", "1 month", "3 months"] },
        defaultValue: "1 week",
      },
      {
        name: "Move to Quiet after",
        description: "Repositories without a release for this long are listed under Quiet.",
        values: { type: "select", options: ["Never", "1 month", "3 months", "6 months", "1 year", "2 years"] },
        defaultValue: "6 months",
      },
      {
        name: "Show changelog preview",
        description: "Preview the release notes under new releases.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Repositories",
        description: "The repositories to show releases for.",
        values: {
          name: "Repositories",
          type: "array",
          configuration: {
            items: [
              {
                name: "Provider",
                description: "Provider to fetch the repository or package releases from.",
                values: "Select from the available providers.",
                defaultValue: "-",
              },
              {
                name: "Identifier",
                description: 'The identifier of the repository or package, e.g. "homarr-labs/homarr".',
                values:
                  'Any valid provider identifier. GHCR also accepts full image refs like "ghcr.io/owner/package:tag".',
                defaultValue: "-",
              },
              {
                name: "Provider URL",
                description: "Base URL for the provider.",
                values: "Any valid URL.",
                defaultValue: "Provider default",
              },
              {
                name: "Name",
                description: "Display name of the repository.",
                values: { type: "string" },
                defaultValue: "-",
              },
              {
                name: "Icon URL",
                description: "URL to the icon of the repository.",
                values: { type: "string" },
                defaultValue: "-",
              },
              {
                name: "Version Regex",
                description: "The regex to extract the version from the release tag.",
                values: {
                  name: "Version Regex",
                  type: "object",
                  configuration: {
                    items: [
                      {
                        name: "Prefix",
                        description: "The prefix to match before the version.",
                        values: { type: "string" },
                        defaultValue: "",
                      },
                      {
                        name: "Precision",
                        description: "The precision of the version",
                        values: {
                          type: "select",
                          options: ["None", "#", "#.#", "#.#.#", "#.#.#.#", "#.#.#.#.#"],
                        },
                        defaultValue: "None",
                      },
                      {
                        name: "Suffix",
                        description: "The suffix to match after the version.",
                        values: { type: "string" },
                        defaultValue: "",
                      },
                    ],
                  },
                },
                defaultValue: "None",
              },
              {
                name: "Linked Integrations",
                description: "The integrations whose running version is shown next to the latest release.",
                values: "Select from the integrations selected for the widget.",
                defaultValue: "None",
              },
            ],
          },
        },
        defaultValue: "None",
      },
    ],
  },
};

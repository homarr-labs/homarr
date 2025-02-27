import { IconCode } from "@tabler/icons-react";
import { z } from "zod";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("repositories", {
  icon: IconCode,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      sortBy: factory.select({
        defaultValue: "releaseDate",
        options: [
          { value: "releaseDate", label: "Release Date" },
          { value: "name", label: "Name" },
          { value: "provider", label: "Provider" },
        ],
      }),
      showOnlyNewReleases: factory.switch({
        defaultValue: true,
      }),
      repositories: factory.multiRepositories({
        defaultValue: [],
        validate: z.array(
          z.object({
            provider: z.object({
              name: z.string().min(1),
              url: z.string().min(1),
              iconUrl: z.string().url().or(z.literal("")),
            }),
            identifier: z.string().min(1),
            versionRegex: z.string().refine(
              (val) => {
                if (val === "") return true;

                try {
                  new RegExp(val);
                  return true;
                } catch {
                  return false;
                }
              },
              {
                message: "Invalid regular expression",
              },
            ),
            iconUrl: z.string().url().optional(),
          }),
        ),
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));

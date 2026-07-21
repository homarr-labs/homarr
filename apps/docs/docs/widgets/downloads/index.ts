import { WidgetDefinition } from "@site/src/types";
import { IconDownload } from "@tabler/icons-react";

const columnsList = [
  "name",
  "progress",
  "size",
  "downSpeed",
  "upSpeed",
  "time",
  "state",
  "added",
  "ratio",
  "received",
  "sent",
  "category",
  "integration",
  "index",
  "type",
];
const sortColumns = columnsList.filter((c) => !["state", "category"].includes(c));

export const downloadsWidget: WidgetDefinition = {
  icon: IconDownload,
  name: "Download Client",
  description: "Allows you to view and manage your Downloads from both Torrent and Usenet clients.",
  path: "../../widgets/downloads",
  configuration: {
    items: [
      {
        name: "Columns to show",
        description:
          "Select the columns you want to display in the widget. Columns automatically hide/show based on widget width.",
        values: `List of columns: ${columnsList.join(", ")}`,
        defaultValue: ["name", "progress", "downSpeed", "time", "state"].join(", "),
      },
      {
        name: "Default sort column",
        description: "The column used for initial sorting when the widget loads.",
        defaultValue: "progress",
        values: `List of columns: ${sortColumns.join(", ")}`,
      },
      {
        name: "Invert sorting",
        description: "This will invert the default sorting order.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Show usenet entries marked as completed",
        description: "This will show entries that have been completed in your Usenet client.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show torrent entries marked as completed",
        description: "This will show entries that have been completed in your Torrent client.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show Miscellaneous entries marked as completed",
        description: "This will show entries that have been completed in your Miscellaneous client.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Hide completed torrent under this threshold (in kiB/s)",
        description:
          "This will hide completed torrent entries that have a download speed below the specified threshold.",
        values: "Any number above 0, 0 to disable",
        defaultValue: "0",
      },
      {
        name: "Categories/labels to filter",
        description: "You can filter the items by categories or labels. Use a comma to separate multiple values.",
        values: "Comma-separated list of categories or labels",
        defaultValue: "-",
      },
      {
        name: "Filter as a whitelist",
        description:
          "If enabled, only items that match the filter will be shown. If disabled, items that do not match the filter will be hidden.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
      {
        name: "Use filter to calculate Ratio",
        description: "This will use the category filter when calculating the global torrent ratio.",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Limit items per integration",
        description: "This will limit the number of items shown per integration, not globally.",
        values: "Any number above 1",
        defaultValue: "50",
      },
    ],
  },
};

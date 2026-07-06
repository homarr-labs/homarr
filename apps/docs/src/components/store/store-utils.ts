import type { StoreSubmission } from "@site/src/lib/pocketbase";

export const downloadSubmissionJson = (submission: StoreSubmission) => {
  const url = URL.createObjectURL(new Blob([submission.content], { type: "application/json" }));
  Object.assign(document.createElement("a"), {
    href: url,
    download: `${submission.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.json`,
  }).click();
  URL.revokeObjectURL(url);
};

export const voteDelta = (prev: 1 | -1 | undefined, next: 1 | -1): [up: number, down: number] => {
  if (!prev) return next === 1 ? [1, 0] : [0, 1];
  if (prev === next) return next === 1 ? [-1, 0] : [0, -1];
  return next === 1 ? [1, -1] : [-1, 1];
};

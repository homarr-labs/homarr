import type { WorkshopSubmissionDetail } from "@homarr/workshop/schema";
import { workshopExportFilename } from "@homarr/workshop/schema";

export function downloadWorkshopSubmission(submission: WorkshopSubmissionDetail) {
  const url = URL.createObjectURL(
    new Blob([submission.content], {
      type: submission.type === "customCss" ? "text/css" : "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = workshopExportFilename(submission.title, submission.type);
  link.click();
  URL.revokeObjectURL(url);
}

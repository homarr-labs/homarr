import type { SubmissionType } from "@site/src/lib/workshop-schema";

export const getJsonImportSubmissionType = (_currentType: SubmissionType | null): SubmissionType => "customWidget";

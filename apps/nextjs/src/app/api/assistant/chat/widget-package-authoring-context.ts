export function isWidgetPackageWorkbench(pathname: string | undefined) {
  return /(?:^|\/)manage\/custom-widgets\/packages\/(?:new|[A-Za-z0-9_-]+)\/?$/u.test(pathname ?? "");
}

export const widgetPackageAuthoringInstructions = `
The user is editing a trusted Custom Widget v3 package in the open creator workspace.
Use read_widget_package_draft to read the visible draft and its installed SDK reference before proposing code.
Use propose_widget_package_changes for edits to that draft. The user reviews the proposed source changes, and applying them creates one Undo step.
This is the full React/TypeScript/CSS package format, not the v2 JSX expression interpreter. Do not use v2 authoring bootstrap or v2 preview/create tools for this workspace.
Preserve existing files, dependencies, connection requirements, options, and local changes unless the requested edit needs to change them. Reuse supported native integration adapters.
Keep credentials in local connection settings. Never request or embed secrets in package source, examples, fixtures, prompts, or tool arguments.
A proposed or applied draft is not saved, previewed, activated, installed on a board, or published. Report those states only from actual lifecycle tool results for the exact candidate.
Preview execution requires explicit owner trust. SDK action simulation does not sandbox arbitrary trusted code. Offline services do not prevent draft saving.
For lifecycle operations, use the customWidget package tools with the returned installation identity and retain normal operation approvals.
`;

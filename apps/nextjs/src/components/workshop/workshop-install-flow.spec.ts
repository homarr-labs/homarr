// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { getWorkshopAssistantProviderUrl, getWorkshopWebUrl } from "./workshop-client";

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

const detailPage = "apps/nextjs/src/app/[locale]/manage/custom-widgets/workshop/[id]/_workshop-detail.tsx";
const browsePage = "apps/nextjs/src/app/[locale]/manage/custom-widgets/workshop/_workshop-browse.tsx";
const browseRoutePage = "apps/nextjs/src/app/[locale]/manage/custom-widgets/workshop/page.tsx";
const publishPage = "apps/nextjs/src/app/[locale]/manage/custom-widgets/publish/[id]/_workshop-publish-form.tsx";
const cssButton = "apps/nextjs/src/components/workshop/workshop-css-import-button.tsx";

describe("Workshop widget install flow", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("links to the runtime-configured Workshop entry", () => {
    document.head.innerHTML = '<meta name="homarr-workshop-web-url" content="https://preview.example/workshop/">';

    expect(getWorkshopWebUrl()).toBe("https://preview.example/workshop");
    expect(getWorkshopWebUrl("widget/id")).toBe("https://preview.example/workshop/widget%2Fid");
  });

  it("uses the runtime Workshop web URL independently from the API origin", () => {
    document.head.innerHTML = [
      '<meta name="homarr-workshop-api-url" content="https://api.example.com/">',
      '<meta name="homarr-workshop-web-url" content="https://community.example.com/workshop">',
    ].join("");

    expect(getWorkshopWebUrl()).toBe("https://community.example.com/workshop");
  });

  it("derives the Homarr provider endpoint from the runtime Workshop API", () => {
    document.head.innerHTML = '<meta name="homarr-workshop-api-url" content="https://api.preview.example/">';

    expect(getWorkshopAssistantProviderUrl()).toBe("https://api.preview.example/api/ai/v1");
  });

  it("installs from a page with a sticky footer instead of stacked modals", () => {
    const detail = read(detailPage);

    expect(detail).toContain("ManageStickyFooter");
    expect(detail).toContain("useCustomWidgetImport");
    // Review and install happen on one surface, so neither Modal.Stack nor the review dialog is involved.
    expect(detail).not.toContain("Modal.Stack");
    expect(detail).not.toContain("useModalsStack");
    expect(detail).not.toContain("CustomWidgetImportDialog");
  });

  it("browses the Workshop as a card grid with per-item Workshop links", () => {
    const browse = read(browsePage);
    const route = read(browseRoutePage);

    expect(browse).toContain("WorkshopSubmissionGrid");
    expect(browse).toContain("SearchInput");
    expect(browse).toContain("TablePagination");
    expect(browse).toContain("CustomWidgetTabs");
    expect(route).toContain("resolveHomarrUrlConfig");
    expect(route).toContain("workshopWebUrl={workshopWebUrl}");
    expect(browse).toContain("workshopWebUrl: string");
    expect(browse).toContain("href={workshopWebUrl}");
    expect(browse).toContain('workshopWebUrl.replace(/\\/+$/u, "")');
    expect(browse).toContain("encodeURIComponent(item.id)");
    expect(browse).toContain("WorkshopVoteControl");
    expect(browse).not.toContain("Modal");
  });

  it("renders the grid with real cards and screenshot previews", () => {
    const grid = read("apps/nextjs/src/components/workshop/workshop-submission-grid.tsx");
    const card = read("apps/nextjs/src/components/workshop/workshop-submission-card.tsx");

    expect(grid).toContain("SimpleGrid");
    expect(card).toContain("Card.Section");
    expect(card).toContain("PREVIEW_HEIGHT");
  });

  it("shows the viewer's own vote as a filled control", () => {
    const vote = read("apps/nextjs/src/components/workshop/workshop-vote-control.tsx");

    expect(vote).toContain("useWorkshopUserVotesQuery");
    expect(vote).toContain("IconArrowBigUpFilled");
    expect(vote).toContain("IconArrowBigDownFilled");
    expect(vote).toContain('color={upvoted ? "red" : "gray"}');
    expect(vote).toContain("aria-pressed={upvoted}");
  });

  it("previews screenshots large with a zoom lightbox", () => {
    const screenshots = read("apps/nextjs/src/components/workshop/workshop-screenshots.tsx");
    const detail = read(detailPage);

    expect(screenshots).toContain("1200x800");
    expect(screenshots).toContain("zoomScreenshot");
    expect(detail).toContain("WorkshopScreenshots");
  });

  it("publishes from a page with the same sticky footer", () => {
    const publish = read(publishPage);

    expect(publish).toContain("ManageStickyFooter");
    expect(publish).not.toContain("useModalsStack");
    expect(publish).not.toMatch(/<Modal\b/u);
  });

  it("imports Custom CSS from a single modal", () => {
    const css = read(cssButton);

    expect(css).toContain("WorkshopSubmissionGrid");
    expect(css).toContain("useConfirmModal");
    expect(css).not.toContain("useModalsStack");
    expect(css).not.toContain("Modal.Stack");
  });

  it("cannot import the same widget twice and returns to the installed list", () => {
    const importer = read("apps/nextjs/src/components/custom-widgets/use-custom-widget-import.ts");
    const detail = read(detailPage);

    // The mutation creates a new record per call, so a second click must be impossible.
    expect(importer).toContain("if (!configuredWidget || pending || succeeded) return;");
    expect(importer).toContain("setSucceeded(true)");
    expect(detail).toContain("router.push(installedHref)");
    expect(detail).toContain("disabled={!compatible || !importer.ready || importer.succeeded}");
    // The heavy edit form is no longer the post-install destination.
    expect(detail).not.toContain("/manage/custom-widgets/edit/");
  });

  it("keeps typed credentials across a background refetch of the submission", () => {
    const importer = read("apps/nextjs/src/components/custom-widgets/use-custom-widget-import.ts");
    const detail = read(detailPage);

    // Voting invalidates the detail query. If the setup reset keyed off the widget
    // object identity, the refetch would silently clear part-typed API keys.
    expect(importer).toContain("const sourcesKey = JSON.stringify(widget?.sources ?? {})");
    expect(importer).toContain("[sourcesKey]");
    expect(importer).not.toContain("getCustomWidgetSourceSetups(widget?.sources ?? {}), [widget])");
    expect(detail).toContain("const content = detail.data?.content;");
    expect(detail).toContain("[content]");
  });

  it("keeps the sign-in hint reachable when voting is unavailable", () => {
    const vote = read("apps/nextjs/src/components/workshop/workshop-vote-control.tsx");

    // Mantine tooltips do not fire on disabled controls, so the hint hangs off the wrapper.
    expect(vote).toContain('canVote ? controls : <Tooltip label={t("signInHint")}>{controls}</Tooltip>');
  });

  it("cannot publish the same widget twice", () => {
    const publish = read(publishPage);

    expect(publish).toContain("if (createSubmission.isPending) return;");
    expect(publish).toContain("createSubmission.isPending ||");
  });

  it("no longer ships the stacked-modal install components", () => {
    for (const removed of [
      "apps/nextjs/src/components/workshop/workshop-browser.tsx",
      "apps/nextjs/src/components/workshop/workshop-install-button.tsx",
      "apps/nextjs/src/components/workshop/workshop-installer.tsx",
      "apps/nextjs/src/components/workshop/workshop-publish-modal.tsx",
      "apps/nextjs/src/components/workshop/workshop-submission-list.tsx",
      "apps/nextjs/src/components/workshop/workshop-submission-item.tsx",
    ]) {
      expect(() => read(removed)).toThrow();
    }
  });
});

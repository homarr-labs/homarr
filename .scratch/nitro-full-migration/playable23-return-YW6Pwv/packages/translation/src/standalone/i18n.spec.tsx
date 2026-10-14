import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useCurrentIntlLocale, useCurrentLocale, useI18n, useI18nMessages } from "../client";

import { I18nProvider } from "./client";
import { loadRequestI18n } from "./server";

function createAppLink() {
  return <a href="/manage/apps/new">here</a>;
}

function LocalizedView() {
  const t = useI18n("widget.common.app");
  const locale = useCurrentLocale();
  const intlLocale = useCurrentIntlLocale();
  const messages = useI18nMessages();
  expect(messages).toHaveProperty("widget.common.app.description");
  return (
    <section data-locale={locale} data-intl-locale={intlLocale}>
      {t.rich("description", { here: createAppLink })}
    </section>
  );
}

describe("standalone translation facade", () => {
  it("renders the preserved app-create rich link and zero/one/other catalog plurals", async () => {
    const request = await loadRequestI18n({
      locale: "en",
      timeZone: "UTC",
      now: new Date("2026-10-10T12:00:00.000Z"),
    });
    const app = request.getI18n("widget.common.app");
    const review = request.getI18n("init.studio.review");
    const html = renderToStaticMarkup(
      <p>{app.rich("description", { here: () => <a href="/manage/apps/new">here</a> })}</p>,
    );
    expect(html).toBe('<p>Click <a href="/manage/apps/new">here</a> to create a new app</p>');
    expect([0, 1, 2].map((count) => review("sidebarsValue", { count }))).toEqual(["None", "1 sidebar", "2 sidebars"]);
  });

  it("keeps simultaneous explicit English and Hebrew request translators and provider messages isolated", async () => {
    const { promise: ready, resolve } = Promise.withResolvers<void>();
    let arrivals = 0;
    const results = await Promise.all(
      ["en", "he"].map(async (locale) => {
        const request = await loadRequestI18n({ locale, timeZone: "UTC", now: new Date("2026-10-10T12:00:00.000Z") });
        const t = request.getI18n("init.studio.board");
        const before = t("columnCount", { count: 2 });
        if (++arrivals === 2) resolve();
        await ready;
        await Promise.resolve();
        const after = t("columnCount", { count: 2 });
        const html = renderToStaticMarkup(
          <I18nProvider snapshot={request.snapshot}>
            <LocalizedView />
          </I18nProvider>,
        );
        return { locale, before, after, html };
      }),
    );
    expect(results.map(({ before, after }) => ({ before, after }))).toEqual([
      { before: "2 columns", after: "2 columns" },
      { before: "2 עמודות", after: "2 עמודות" },
    ]);
    expect(results[0]?.html).toBe(
      '<section data-locale="en" data-intl-locale="en">Click <a href="/manage/apps/new">here</a> to create a new app</section>',
    );
    expect(results[1]?.html).toBe(
      '<section data-locale="he" data-intl-locale="he">לחץ על <a href="/manage/apps/new">here</a> כדי ליצור אפליקציה חדשה</section>',
    );
  });
});

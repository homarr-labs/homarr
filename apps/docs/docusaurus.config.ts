import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";
const a11yEmoji = require("@fec/remark-a11y-emoji");

const config: Config = {
  title: "Homarr documentation",
  tagline: "A simple yet powerful dashboard for your server.",
  url: "https://homarr.dev",
  baseUrl: "/",
  trailingSlash: undefined,
  favicon: "img/logo.png",
  organizationName: "homarr-labs",
  projectName: "homarr",
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  onDuplicateRoutes: "throw",

  future: {
    v4: {
      removeLegacyPostBuildHeadAttribute: true,
      useCssCascadeLayers: true,
      siteStorageNamespacing: true,
      fasterByDefault: true,
      mdx1CompatDisabledByDefault: false,
    },
    faster: {
      swcHtmlMinimizer: false,
    },
  },

  markdown: {
    mermaid: true,
    format: "detect",
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
  },

  themes: ["@docusaurus/theme-mermaid"],

  scripts: [
    {
      src: "https://widget.kapa.ai/kapa-widget.bundle.js",
      "data-website-id": "1e4656f4-abeb-4343-bbae-1d8626f52378",
      "data-project-name": "Homarr",
      "data-project-color": "#2B2B2B",
      "data-project-logo": "https://homarr.dev/img/favicon.png",
      async: true,
    },
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: ({ docPath }) => `https://github.com/homarr-labs/homarr/edit/dev/apps/docs/docs/${docPath}`,
          remarkPlugins: [a11yEmoji],
          exclude: [],
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/homarr-labs/homarr/edit/dev/apps/docs",
          authorsMapPath: "authors.yml",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          ignorePatterns: ["/tags/**", "/docs/category/**"],
          filename: "sitemap.xml",
          createSitemapItems: async ({ routes, siteConfig, defaultCreateSitemapItems }) => {
            const items = await defaultCreateSitemapItems({ routes, siteConfig });
            return items.map((item) => {
              const path = new URL(item.url).pathname;
              if (path === "/" || path === "") {
                return { ...item, priority: 1.0, changefreq: "weekly" };
              }
              if (path.startsWith("/docs/")) {
                return { ...item, priority: 0.7, changefreq: "monthly" };
              }
              if (path.startsWith("/blog/")) {
                return { ...item, priority: 0.3, changefreq: "never" };
              }
              if (path.startsWith("/about-us")) {
                return { ...item, priority: 0.4, changefreq: "yearly" };
              }
              return item;
            });
          },
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "Homarr",
      logo: {
        alt: "Homarr Logo",
        src: "img/logo.png",
      },
      items: [
        {
          label: "Documentation",
          type: "doc",
          position: "left",
          docId: "getting-started/index",
        },
        {
          label: "Blog",
          position: "left",
          to: "/blog",
        },
        {
          label: "About us",
          position: "left",
          to: "/about-us",
        },
        {
          to: "https://demo.homarr.dev/",
          label: "Demo",
          position: "right",
        },
        {
          to: "https://opencollective.com/homarr",
          label: "💴 Donate",
          position: "right",
        },
        {
          type: "dropdown",
          label: "Community",
          position: "right",
          items: [
            {
              to: "https://discord.com/invite/aCsmEV5RgA",
              label: "Discord",
            },
            {
              to: "https://github.com/homarr-labs/homarr",
              label: "GitHub",
            },
            {
              to: "https://www.answeroverflow.com/c/972958686051962910",
              label: "Answer Overflow",
            },
            {
              to: "https://crowdin.com/project/homarr_labs",
              label: "Community translations (Crowdin)",
            },
            {
              to: "https://www.reddit.com/r/homarr/",
              label: "Reddit",
            },
            {
              to: "https://opencollective.com/homarr",
              label: "OpenCollective",
            },
            {
              to: "https://x.com/homarr_labs",
              label: "X / Twitter",
            },
          ],
        },
        {
          type: "search",
          position: "right",
        },
      ],
      hideOnScroll: false,
    },
    algolia: {
      appId: "N69WSPZTID",
      apiKey: "b2b00f4ed8ca3dc87b5d211c55121416",
      indexName: "Docusaurus",
      contextualSearch: false,
      searchPagePath: "search",
      insights: false,
      replaceSearchResultPathname: {
        from: "/docs/(next|\\d+(?:\\.\\d+)*)/",
        to: "/docs/",
      },
    },
    footer: {
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Installation",
              to: "/docs/category/getting-started",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Discord",
              to: "https://discord.com/invite/aCsmEV5RgA",
            },
            {
              label: "GitHub",
              to: "https://github.com/homarr-labs/homarr",
            },
            {
              label: "Donate",
              to: "https://opencollective.com/homarr",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "/blog",
            },
            {
              label: "About us",
              to: "/about-us",
            },
          ],
        },
      ],
      logo: {
        alt: "Homarr Logo",
        src: "img/logo.png",
        height: 100,
      },
      copyright: `<span class="copyright_text">Copyright © ${new Date().getFullYear()} Homarr<span> — <a href="/docs/community/license">License</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      defaultLanguage: "bash",
    },
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: true,
    },
    metadata: [
      {
        name: "keywords",
        content: "Homarr, Dashboard, Selfhosted, Hosting, Modules, Open-Source",
      },
    ],
    zoom: {
      selector: ".markdown :not(em) > img",
      background: {
        light: "rgb(255, 255, 255)",
        dark: "rgb(50, 50, 50)",
      },
      config: {
        // options you can specify via https://github.com/francoischalifour/medium-zoom#usage
        margin: 80,
      },
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  } satisfies Preset.ThemeConfig,
  plugins: [
    function homarrPackagesPlugin() {
      return {
        name: "resolve-homarr-packages",
        configureWebpack() {
          return { resolve: { symlinks: false } };
        },
      };
    },
    [
      "posthog-docusaurus",
      {
        apiKey: "phc_pWxeD1hbl4ip02JYReX1Crjkt5DhB3dduigirHMCtFE",
        appUrl: "https://hog.homarr.dev",
        enableInDevelopment: true,
        ui_host: "https://eu.posthog.com",
        defaults: "2026-01-30",
        autocapture: true,
        disable_session_recording: true,
        advanced_disable_feature_flags: true,
      },
    ],
    "docusaurus-plugin-image-zoom",
    require.resolve("./plugins/validate-docs-coverage"),
    function disableExpensiveBundlerOptimizationPlugin() {
      return {
        name: "disable-expensive-bundler-optimizations",
        configureWebpack(_config: unknown, isServer: boolean) {
          return {
            optimization: {
              concatenateModules: process.env.CI != null && process.env.CI !== "false" ? !isServer : false,
            },
          };
        },
      };
    },
    "@signalwire/docusaurus-plugin-llms-txt",
    async function tailwindCssPlugin() {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require("@tailwindcss/postcss"));
          return postcssOptions;
        },
      };
    },
  ],
};

export default config;

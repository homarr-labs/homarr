/** biome-ignore-all lint/suspicious/useAwait: <explanation> */
/** biome-ignore-all lint/style/noCommonJs: <explanation> */
import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";
import { EnumChangefreq } from "sitemap";

const a11yEmoji = require("@fec/remark-a11y-emoji");

const config: Config = {
  title: "Homarr documentation",
  tagline: "A simple yet powerful dashboard for your server.",
  url: "https://homarr.dev",
  baseUrl: "/",
  favicon: "img/logo.png",
  // Used for publishing to GitHub Pages
  organizationName: "homarr-labs",
  projectName: "documentation",
  // Has to be set even if not using translations
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  onBrokenAnchors: "throw",
  onDuplicateRoutes: "throw",

  markdown: {
    mermaid: true,
    format: "detect",
  },

  themes: ["@docusaurus/theme-mermaid"],

  scripts: [
    {
      src: "https://umami.homarr.dev/script.js",
      async: true,
      "data-website-id": "2847e7dd-32a1-41f2-a6ed-2d9db17d71b9",
    },
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
          editUrl: ({ docPath }) => `https://github.com/homarr-labs/documentation/edit/master/docs/${docPath}`,
          remarkPlugins: [a11yEmoji],
          exclude: ["**/custom-widget.mdx"],
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/homarr-labs/documentation/edit/master",
          authorsMapPath: "authors.yml",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        sitemap: {
          changefreq: EnumChangefreq.WEEKLY,
          priority: 0.5,
          ignorePatterns: ["/tags/**"],
          filename: "sitemap.xml",
          createSitemapItems: async (params) => {
            const { defaultCreateSitemapItems, ...rest } = params;
            const items = await defaultCreateSitemapItems(rest);
            const filteredItems = items.filter((item) => {
              // Remove all versions except the latest one (all the /docs/{numbers}/* and /docus/next/*)
              return !/\/docs\/(\d+(\.\d+)*|next)\//.test(new URL(item.url).pathname);
            });
            return filteredItems;
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
          type: "docsVersionDropdown",
          position: "left",
          dropdownActiveClassDisabled: true,
          includeCurrentVersion: false,
        },
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
        /*{
          to: 'https://demo.homarr.dev/',
          label: '🚀 Demo',
          position: 'right',
        },*/
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
      contextualSearch: true,
      indexName: "homarr",
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
    "docusaurus-plugin-image-zoom",
    async function tailwindCssPlugin(context, options) {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          // Appends TailwindCSS and AutoPrefixer.
          postcssOptions.plugins.push(require("tailwindcss"));
          postcssOptions.plugins.push(require("autoprefixer"));
          return postcssOptions;
        },
      };
    },
  ],
};

export default config;

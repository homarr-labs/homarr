import { loader } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineCollections, defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

const titleFromSource = (source: string, path: string) => {
  const heading = /^#\s+(.+)$/m
    .exec(source)?.[1]
    ?.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
  if (heading) return heading;

  const name =
    path
      .split("/")
      .at(-1)
      ?.replace(/\.(md|mdx)$/, "")
      .replace(/^index$/, "Overview") ?? "Overview";
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const docs = defineDocs({
  dir: "docs",
  docs: {
    schema: ({ source, path }) =>
      pageSchema
        .extend({
          title: z.string().optional(),
          hide_title: z.boolean().optional(),
          sidebar_label: z.string().optional(),
          sidebar_position: z.number().optional(),
          tags: z.array(z.string()).optional(),
        })
        .transform((data) => ({ ...data, title: data.title ?? titleFromSource(source, path) })),
    postprocess: {
      extractLinkReferences: true,
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const posts = defineCollections({
  type: "doc",
  dir: "blog",
  files: ["**/index.mdx"],
  schema: pageSchema.extend({
    date: z.string().date(),
    authors: z.array(z.string()),
    tags: z.array(z.string()).optional(),
    slug: z.string().optional(),
  }),
  postprocess: {
    extractLinkReferences: true,
    includeProcessedMarkdown: true,
  },
});

export const docsRoute = "/docs";
export const docsContentRoute = "/llms.mdx/docs";

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
});

export function getPageMarkdownUrl(page: (typeof source)["$inferPage"]) {
  const segments = [...page.slugs, "content.md"];

  return {
    segments,
    url: `/${[...docsContentRoute.split("/"), ...segments].filter(Boolean).join("/")}`,
  };
}

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");
  const body = processed.replace(/^\s*#\s+[^\n]+\n+/, "");

  return `# ${page.data.title} (${page.url})\n\n${body}`;
}

export type BlogPost = (typeof posts.entries)[number];

export function getPostSegments(post: BlogPost) {
  if (post.slug) return [post.slug];

  const [year, datedFolder = ""] = post.info.path.split("/");
  const match = /^(\d{2})-(\d{2})-(.+)$/.exec(datedFolder);
  return match ? [year, match[1], match[2], match[3]] : [year, datedFolder].filter(Boolean);
}

export function getPostUrl(post: BlogPost) {
  return `/blog/${getPostSegments(post).join("/")}`;
}

export function getPostBySegments(segments: string[]) {
  return posts.entries.find((post) => getPostSegments(post).join("/") === segments.join("/"));
}

export function getPostMarkdownUrl(post: BlogPost) {
  return `/llms.mdx/blog/${[...getPostSegments(post), "content.md"].join("/")}`;
}

export async function getPostLLMText(post: BlogPost) {
  const processed = await post.getText("processed");
  return `# ${post.title} (${getPostUrl(post)})\n\n${processed}`;
}

export async function getPostExcerpt(post: BlogPost) {
  const raw = await post.getText("raw");
  return raw
    .replace(/^---[\s\S]*?---\s*/, "")
    .split("{/* Historical excerpt boundary. */}", 1)[0]
    .replace(/^import\s.+$/gm, "")
    .replace(/^#\s+.+$/m, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

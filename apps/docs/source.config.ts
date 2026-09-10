import { remarkDirectiveAdmonition, remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { defineConfig } from "fumadocs-mdx/config";
import remarkDirective from "remark-directive";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      remarkDirective,
      [
        remarkDirectiveAdmonition,
        {
          types: {
            note: "info",
            tip: "idea",
            info: "info",
            warn: "warning",
            warning: "warning",
            caution: "warning",
            important: "warning",
            danger: "error",
            error: "error",
            success: "success",
          },
        },
      ],
      remarkMdxMermaid,
    ],
    remarkImageOptions: {
      onError: "hide",
    },
  },
});

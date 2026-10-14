const mantine = require("postcss-preset-mantine");
const simpleVars = require("postcss-simple-vars");

module.exports = {
  plugins: [
    {
      postcssPlugin: "homarr-source-css",
      async Once(root, { postcss, result }) {
        const processed = await postcss([
          mantine(),
          simpleVars({
            variables: {
              "mantine-breakpoint-xs": "36em",
              "mantine-breakpoint-sm": "48em",
              "mantine-breakpoint-md": "62em",
              "mantine-breakpoint-lg": "75em",
              "mantine-breakpoint-xl": "88em",
            },
          }),
        ]).process(root, { ...result.opts, map: false });
        result.messages.push(...processed.messages);
      },
    },
  ],
};

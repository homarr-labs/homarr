// css-tree's modular exports use the same APIs as its typed root entrypoint.
declare module "css-tree/generator" {
  import { generate } from "css-tree";
  export default generate;
}

declare module "css-tree/parser" {
  import { parse } from "css-tree";
  export default parse;
}

declare module "css-tree/utils" {
  export { ident } from "css-tree";
}

declare module "css-tree/walker" {
  import { walk } from "css-tree";
  export default walk;
}

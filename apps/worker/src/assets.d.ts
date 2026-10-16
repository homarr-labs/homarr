// Shared widget contract inference references stylesheet types; worker bundles
// reject emitted UI modules and do not load these assets at runtime.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}
declare module "*.css";
declare module "*.scss";

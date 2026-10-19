// Shared widget contract inference references stylesheet types in server runtimes.
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

import type { Bootstrap } from "../contracts/render";

export const bootstrapElementId = "homarr-bootstrap";

export function BootstrapScript({ bootstrap }: { bootstrap: Bootstrap }) {
  const json = JSON.stringify(bootstrap).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  return <script id={bootstrapElementId} type="application/json" dangerouslySetInnerHTML={{ __html: json }} />;
}

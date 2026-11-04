import { ImageProxy } from "@homarr/image-proxy";

export const GET = async (request: Request, props: { params: Promise<{ id: string }> }) => {
  const { id } = await props.params;

  const imageProxy = new ImageProxy();
  const result = await imageProxy.forwardImageAsync(id, request.signal);

  if ("error" in result) {
    const status = result.error === "upstream-error" ? result.statusCode : result.error === "fetch-error" ? 502 : 404;
    return new Response(null, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Homarr-Image-Proxy-Error": result.error,
      },
    });
  }

  if ("redirectUrl" in result) return Response.redirect(result.redirectUrl);

  return new Response(result.image, {
    headers: {
      "Cache-Control": "public, max-age=3600, immutable", // Cache for 1 hour
      // Icons may contain HTML or SVG supplied by an untrusted website. They may
      // render as images, but must never execute as a document on Homarr's origin.
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
      ...(result.contentType ? { "Content-Type": result.contentType } : {}),
    },
  });
};

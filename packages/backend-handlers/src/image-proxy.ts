import { ImageProxy } from "@homarr/image-proxy";

export const GET = async (request: Request, props: { params: Promise<{ id: string }> }) => {
  const { id } = await props.params;

  const imageProxy = new ImageProxy();
  const result = await imageProxy.forwardImageAsync(id, request.signal);

  if ("error" in result) {
    let status = 404;
    if (result.error === "upstream-error") status = result.statusCode;
    if (result.error === "fetch-error") status = 502;
    return new Response(null, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Homarr-Image-Proxy-Error": result.error,
      },
    });
  }

  return new Response(result.image, {
    headers: {
      "Cache-Control": "public, max-age=3600, immutable", // Cache for 1 hour
      ...(result.contentType ? { "Content-Type": result.contentType } : {}),
    },
  });
};

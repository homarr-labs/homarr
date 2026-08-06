import { ImageProxy } from "@homarr/image-proxy";

export const GET = async (_request: Request, props: { params: Promise<{ id: string }> }) => {
  const { id } = await props.params;

  const imageProxy = new ImageProxy();
  const result = await imageProxy.forwardImageAsync(id);

  if ("error" in result) {
    const status = result.error === "upstream-error" ? result.statusCode : result.error === "fetch-error" ? 502 : 404;
    return new Response(null, {
      status,
      headers: {
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

import { ImageProxy } from "@homarr/image-proxy";
import { FrameleafConnectionError } from "@homarr/integrations/frameleaf";

import { frameleafError, frameleafResponseHeaders } from "../../_access";
import { frameleafPhotoQuery, loadFrameleafPhotoAsync } from "../_photo";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const input = frameleafPhotoQuery.parse(Object.fromEntries(query));
    const binding = query.get("binding");
    if (!binding || !/^[a-f0-9]{64}$/.test(binding)) throw new FrameleafConnectionError("consent");
    let photo: Awaited<ReturnType<typeof loadFrameleafPhotoAsync>> | undefined;
    const image = await new ImageProxy().forwardPrivateImageAsync({
      signal: request.signal,
      authorizeAsync: async () => {
        photo = await loadFrameleafPhotoAsync(input);
        if (!photo.asset || photo.binding !== binding) throw new FrameleafConnectionError("consent");
      },
      fetchAsync: async (signal) => {
        if (!photo?.asset) throw new FrameleafConnectionError("consent");
        return await photo.reader.displayAsync(photo.asset.id, signal);
      },
    });
    if (!("image" in image)) throw new FrameleafConnectionError("unavailable");
    return new Response(image.image, {
      headers: {
        ...frameleafResponseHeaders,
        "Content-Type": "image/jpeg",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline; filename=frameleaf.jpg",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    return frameleafError(error);
  }
}

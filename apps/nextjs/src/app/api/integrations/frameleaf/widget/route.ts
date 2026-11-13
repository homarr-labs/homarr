import { frameleafError, frameleafResponseHeaders } from "../_access";
import { frameleafPhotoQuery, loadFrameleafPhotoAsync } from "./_photo";

export async function GET(request: Request) {
  try {
    const input = frameleafPhotoQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
    const result = await loadFrameleafPhotoAsync(input);
    const parameters = new URLSearchParams({
      itemId: input.itemId,
      page: String(input.page),
      binding: result.binding ?? "",
    });
    return Response.json(
      {
        total: result.total,
        caption: result.asset?.title ?? result.asset?.description ?? "",
        imageUrl: result.asset ? `/api/integrations/frameleaf/widget/image?${parameters}` : null,
        libraryUrl: result.context.origin,
      },
      { headers: frameleafResponseHeaders },
    );
  } catch (error) {
    return frameleafError(error);
  }
}

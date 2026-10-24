// Kept free of server imports so client components can build media URLs too.

export const createLocalImageUrl = (id: string) => `/api/user-medias/${id}`;

const videoExtensions: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };

/**
 * Like createLocalImageUrl, but videos get their file extension, which is how
 * board backgrounds tell a video from an image and pick its source type.
 */
export const createLocalMediaUrl = (id: string, contentType: string) => {
  const extension = videoExtensions[contentType];
  return extension ? `${createLocalImageUrl(id)}.${extension}` : createLocalImageUrl(id);
};

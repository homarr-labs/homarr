/** Browser-safe references to media served by the selected Homarr backend. */
export const LOCAL_ICON_REPOSITORY_SLUG = "local";
export const createLocalImageUrl = (id: string) => `/api/user-medias/${id}`;

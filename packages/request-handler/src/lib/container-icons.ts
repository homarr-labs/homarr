import { bestMatch } from "@homarr/common";
import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import { extractContainerImageName } from "@homarr/definitions";

const getImageName = (image: string) => {
  const imageName = extractContainerImageName(image).trim();
  return imageName.length > 0 ? imageName : null;
};

export const addContainerIconsAsync = async <TContainer extends { image: string }>(containers: TContainer[]) => {
  const entries = containers.map((container) => ({ container, imageName: getImageName(container.image) }));
  const likeQueries = entries
    .filter((entry) => entry.imageName !== null)
    .map((entry) => like(icons.name, `%${entry.imageName}%`));
  const dbIcons =
    likeQueries.length > 0
      ? await db.query.icons.findMany({
          where: or(...likeQueries),
        })
      : [];

  return entries.map(({ container, imageName }) => ({
    ...container,
    iconUrl: imageName === null ? null : (bestMatch(imageName, dbIcons, (icon) => icon.name)?.url ?? null),
  }));
};

import { bestMatch } from "@homarr/common";
import { db, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import { extractContainerImageName } from "@homarr/definitions";

export const addContainerIconsAsync = async <TContainer extends { image: string }>(containers: TContainer[]) => {
  const likeQueries = containers.map((container) =>
    like(icons.name, `%${extractContainerImageName(container.image)}%`),
  );
  const dbIcons =
    likeQueries.length > 0
      ? await db.query.icons.findMany({
          where: or(...likeQueries),
        })
      : [];

  return containers.map((container) => ({
    ...container,
    iconUrl: bestMatch(extractContainerImageName(container.image), dbIcons, (icon) => icon.name)?.url ?? null,
  }));
};

import contributors from "@site/public/data/translation-contributions.json";

export const TranslationContributorList = () => {
  return (
    <div className={"flex flex-wrap gap-3 argos-ignore"}>
      {contributors.map((contributor) => (
        <div key={contributor.username} className={"flex flex-col items-center w-24"}>
          <img
            className={"mb-2 aspect-square h-24 w-24 rounded"}
            src={contributor.avatarUrl}
            alt={""}
            loading="lazy"
            decoding="async"
          />
          <h6 className={"truncate text-nowrap max-w-full"}>{contributor.username}</h6>
        </div>
      ))}
    </div>
  );
};

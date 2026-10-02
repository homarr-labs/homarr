const authors: Record<string, { name: string; github: string; image: string }> = {
  "manuel-rw": {
    name: "Manuel",
    github: "manuel-rw",
    image: "https://avatars.githubusercontent.com/u/30572287?v=4",
  },
  ajnart: {
    name: "Ajnart",
    github: "ajnart",
    image: "https://avatars.githubusercontent.com/u/49837342?v=4",
  },
  meierschlumpf: {
    name: "Meierschlumpf",
    github: "Meierschlumpf",
    image: "https://avatars.githubusercontent.com/u/63781622?v=4",
  },
  tagashi: {
    name: "Tagashi",
    github: "tagaishi",
    image: "https://avatars.githubusercontent.com/u/26098587?v=4",
  },
  walkx: {
    name: "Walkx",
    github: "walkxcode",
    image: "https://avatars.githubusercontent.com/u/71191962?v=4",
  },
};

export function getBlogAuthor(author: string) {
  return (
    authors[author] ?? {
      name: author,
      github: author,
      image: `https://github.com/${author}.png?size=96`,
    }
  );
}

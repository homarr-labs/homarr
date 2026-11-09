import { Anchor, Avatar } from "@mantine/core";
import { findAndReplace } from "mdast-util-find-and-replace";

import { SAFE_NEW_TAB_REL } from "@homarr/common";

import classes from "./markdown.module.css";

type MdastTree = Parameters<typeof findAndReplace>[0];

const GITHUB_URL = "https://github.com/";
const LOGIN_PATTERN = "[a-z\\d](?:[a-z\\d]|-(?=[a-z\\d])){0,38}";
const mentionRegex = new RegExp(`@(${LOGIN_PATTERN})(?![\\w@]|-[\\w-]|/\\w)`, "gi");
const loginRegex = new RegExp(`^${LOGIN_PATTERN}$`, "i");
const mentionPrefixRegex = /[\w@/]/;

export const remarkGithubMentions = () => (tree: MdastTree) => {
  findAndReplace(
    tree,
    [
      mentionRegex,
      (match: string, login: string, { index, input }: { index: number; input: string }) => {
        const previous = input.charAt(index - 1);
        if (mentionPrefixRegex.test(previous)) return false;
        return {
          type: "link",
          url: `${GITHUB_URL}${login}`,
          children: [{ type: "text", value: match }],
        };
      },
    ],
    { ignore: ["link", "linkReference"] },
  );
};

export const getMentionLogin = (href: string | undefined, text: unknown) => {
  if (typeof text !== "string" || !text.startsWith("@")) return undefined;
  const login = text.slice(1);
  if (!loginRegex.test(login) || href !== `${GITHUB_URL}${login}`) return undefined;
  return login;
};

export const GithubMention = ({ login }: { login: string }) => (
  <Anchor href={`${GITHUB_URL}${login}`} target="_blank" rel={SAFE_NEW_TAB_REL} className={classes.mention}>
    <Avatar
      component="span"
      src={`${GITHUB_URL}${login}.png?size=40`}
      name={login}
      alt={login}
      size="1.25em"
      radius="xl"
    />
    {`@${login}`}
  </Anchor>
);

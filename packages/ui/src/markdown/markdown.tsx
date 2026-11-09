import type { ComponentProps } from "react";
import { Typography } from "@mantine/core";
import ReactMarkdown from "react-markdown";
import type { Components, ExtraProps, Options } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { SAFE_NEW_TAB_REL } from "@homarr/common";

import { AlertBlockquote, rehypeGithubAlerts } from "./github-alerts";
import { getMentionLogin, GithubMention, remarkGithubMentions } from "./github-mentions";
import classes from "./markdown.module.css";

type LinkProps = ComponentProps<"a"> & ExtraProps;

const ExternalLink = ({ href, children }: LinkProps) => (
  <a href={href} target="_blank" rel={SAFE_NEW_TAB_REL}>
    {children}
  </a>
);

const ExternalLinkOrMention = ({ href, children }: LinkProps) => {
  const login = getMentionLogin(href, children);
  if (login) return <GithubMention login={login} />;
  return <ExternalLink href={href}>{children}</ExternalLink>;
};

const components: Components = { a: ExternalLink, blockquote: AlertBlockquote };
const componentsWithMentions: Components = { ...components, a: ExternalLinkOrMention };

type PluginList = NonNullable<Options["remarkPlugins"]>;

export interface MarkdownProps {
  children: string;
  allowHtml?: boolean;
  githubMentions?: boolean;
  typography?: boolean;
}

export const Markdown = ({ children, allowHtml = false, githubMentions = false, typography = true }: MarkdownProps) => {
  const remarkPlugins: PluginList = [remarkGfm];
  const rehypePlugins: PluginList = [rehypeSanitize, rehypeGithubAlerts];
  let markdownComponents = components;
  if (githubMentions) {
    remarkPlugins.push(remarkGithubMentions);
    markdownComponents = componentsWithMentions;
  }
  if (allowHtml) rehypePlugins.unshift(rehypeRaw);

  const content = (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      skipHtml={!allowHtml}
      components={markdownComponents}
    >
      {children}
    </ReactMarkdown>
  );

  if (!typography) return <div className={classes.root}>{content}</div>;
  return <Typography className={classes.root}>{content}</Typography>;
};

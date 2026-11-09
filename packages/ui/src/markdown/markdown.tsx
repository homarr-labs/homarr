import type { ComponentProps } from "react";
import { Typography } from "@mantine/core";
import ReactMarkdown from "react-markdown";
import type { Components, ExtraProps } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { SAFE_NEW_TAB_REL } from "@homarr/common";

import { AlertBlockquote, rehypeGithubAlerts } from "./github-alerts";
import { getMentionLogin, GithubMention, remarkGithubMentions } from "./github-mentions";
import classes from "./markdown.module.css";

const remarkPlugins = [remarkGfm];
const remarkPluginsWithMentions = [remarkGfm, remarkGithubMentions];
const rehypePlugins = [rehypeSanitize, rehypeGithubAlerts];
const rehypePluginsWithHtml = [rehypeRaw, rehypeSanitize, rehypeGithubAlerts];

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

export interface MarkdownProps {
  children: string;
  allowHtml?: boolean;
  githubMentions?: boolean;
  typography?: boolean;
}

export const Markdown = ({ children, allowHtml = false, githubMentions = false, typography = true }: MarkdownProps) => {
  const Root = typography ? Typography : "div";

  return (
    <Root className={classes.root}>
      <ReactMarkdown
        remarkPlugins={githubMentions ? remarkPluginsWithMentions : remarkPlugins}
        rehypePlugins={allowHtml ? rehypePluginsWithHtml : rehypePlugins}
        skipHtml={!allowHtml}
        components={githubMentions ? componentsWithMentions : components}
      >
        {children}
      </ReactMarkdown>
    </Root>
  );
};

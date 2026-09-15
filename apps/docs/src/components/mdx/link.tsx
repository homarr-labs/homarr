import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Omit<NextLinkProps, "href"> & {
    href?: NextLinkProps["href"];
    to?: NextLinkProps["href"];
  };

export default function Link({ href, to, ...props }: LinkProps) {
  return <NextLink href={href ?? to ?? "#"} {...props} />;
}

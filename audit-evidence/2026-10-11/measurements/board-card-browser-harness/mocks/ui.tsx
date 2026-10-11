import type { AnchorHTMLAttributes, ReactNode } from "react";

export const Link = ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
  <a href={href} {...props}>
    {children}
  </a>
);

export const UserAvatar = () => <span aria-hidden="true" data-testid="mock-avatar" />;

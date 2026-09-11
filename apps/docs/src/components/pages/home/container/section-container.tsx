import { ReactNode } from "react";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
}

export const SectionContainer = ({ children, className }: SectionContainerProps) => {
  return <div className={"mx-auto w-full max-w-6xl px-6 sm:px-8" + (className ? " " + className : "")}>{children}</div>;
};

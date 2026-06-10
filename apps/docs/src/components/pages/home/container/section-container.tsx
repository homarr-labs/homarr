import { ReactNode } from 'react';

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
}

export const SectionContainer = ({ children, className }: SectionContainerProps) => {
  return <div
    className={'mx-auto w-full md:w-2/3 ps-10 pr-10 mb-5' + (className ? ' ' + className : '')}>{children}</div>;
};
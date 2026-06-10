import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
}

export const Badge = ({ children }: BadgeProps) => {
  return (
    <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap  overflow-hidden border-transparent dark:bg-slate-700 bg-slate-200">
      {children}
    </span>
  );
};

import clsx from "clsx";
import { ReactNode } from "react";
import styles from "../../../../../pages/index.module.css";

export interface CommonWidgetProps {
  className?: string;
}

interface WidgetCardProps extends CommonWidgetProps {
  width: 1 | 2;
  children: ReactNode;
  onClick?: () => void;
}
export const WidgetCard = ({ width, children, className, onClick }: WidgetCardProps) => {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      className={clsx(
        styles.widgetCard,
        "flex flex-col justify-center items-center p-2 relative border-none bg-[var(--ifm-navbar-background-color)]",
        className,
        onClick ? "cursor-pointer" : undefined,
      )}
      style={{ width: (128 * width + (width === 2 ? 16 : 0)) * 0.9, height: 128 }}
      type={onClick ? "button" : undefined}
      onClick={onClick}
    >
      {children}
    </Component>
  );
};

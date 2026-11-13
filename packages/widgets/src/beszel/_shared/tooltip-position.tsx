"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { autoUpdate, computePosition, flip, hide, offset, shift } from "@floating-ui/dom";
import type { AreaChartProps } from "@mantine/charts";
import { getDefaultZIndex } from "@mantine/core";

export function createBeszelTooltipProps(
  original: AreaChartProps["tooltipProps"],
  portal: HTMLDivElement | null,
  chartRef: RefObject<HTMLDivElement | null>,
) {
  const content = original?.content;
  if (!original || !portal || typeof content !== "function") return original;

  return {
    ...original,
    portal,
    wrapperStyle: {
      ...original.wrapperStyle,
      position: "fixed" as const,
      left: 0,
      top: 0,
      opacity: 0,
      zIndex: getDefaultZIndex("popover"),
    },
    content: (props: Parameters<typeof content>[0]) => (
      <BeszelTooltipPosition active={props.active} chartRef={chartRef} coordinate={props.coordinate}>
        {content(props)}
      </BeszelTooltipPosition>
    ),
  };
}

interface BeszelTooltipPositionProps {
  active: boolean;
  chartRef: RefObject<HTMLDivElement | null>;
  coordinate: { x: number; y: number } | undefined;
  children: ReactNode;
}

function BeszelTooltipPosition({ active, chartRef, coordinate, children }: BeszelTooltipPositionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const x = coordinate?.x;
  const y = coordinate?.y;

  useLayoutEffect(() => {
    const chart = chartRef.current;
    const floating = contentRef.current?.parentElement;
    if (!active || !chart || !floating || x === undefined || y === undefined) return;

    const reference = {
      contextElement: chart,
      getBoundingClientRect() {
        const bounds = chart.getBoundingClientRect();
        const pointX = bounds.left + (x * bounds.width) / Math.max(1, chart.offsetWidth);
        const pointY = bounds.top + (y * bounds.height) / Math.max(1, chart.offsetHeight);
        return new DOMRect(pointX, pointY, 0, 0);
      },
    };
    let disposed = false;
    const update = () => {
      void computePosition(reference, floating, {
        strategy: "fixed",
        placement: "right-start",
        middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 }), hide()],
      }).then(({ x: left, y: top, middlewareData }) => {
        if (disposed) return;
        Object.assign(floating.style, {
          left: `${left}px`,
          top: `${top}px`,
          opacity: middlewareData.hide?.referenceHidden ? "0" : "1",
        });
      });
    };
    const cleanup = autoUpdate(reference, floating, update);
    return () => {
      disposed = true;
      cleanup();
    };
  }, [active, chartRef, x, y]);

  return <div ref={contentRef}>{children}</div>;
}

"use client";

import type { RefObject } from "react";
import { createContext, useContext, useEffect } from "react";

export const FIT_CONTENT_VIEWPORT_ATTRIBUTE = "data-fit-content-viewport";
export const FIT_CONTENT_NATURAL_ATTRIBUTE = "data-fit-content-natural";

type ReportFitContentSlack = (sectionId: string, slackPx: number) => void;

export const FitContentReportContext = createContext<ReportFitContentSlack | null>(null);

const SLACK_TOLERANCE_PX = 3;
const MIN_FIT_ROW_COUNT = 1;
const MIN_ROW_CHANGE = 0.01;

export const getFitRowCount = ({
  current,
  savedRowCount,
  slackPx,
  rowsPerPixel,
}: {
  current: number;
  savedRowCount: number;
  slackPx: number;
  rowsPerPixel: number;
}) => {
  const next = Math.min(savedRowCount, Math.max(MIN_FIT_ROW_COUNT, current - slackPx * rowsPerPixel));
  return Math.abs(next - current) < MIN_ROW_CHANGE ? current : next;
};

interface UseFitContentReporterInput {
  sectionId: string;
  itemId: string | null;
  bodyRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}

export const useFitContentReporter = ({ sectionId, itemId, bodyRef, enabled }: UseFitContentReporterInput) => {
  const report = useContext(FitContentReportContext);

  useEffect(() => {
    const body = bodyRef.current;
    if (!enabled || !report || !body || !itemId) return;

    let frame: number | null = null;
    let observed: Element[] = [];
    const resizeObserver = new ResizeObserver(() => scheduleMeasure());

    const findTarget = () => {
      const item = body.querySelector(`[data-item-id="${CSS.escape(itemId)}"]`);
      const viewport = item?.querySelector(`[${FIT_CONTENT_VIEWPORT_ATTRIBUTE}]`);
      const natural = viewport?.querySelector(`[${FIT_CONTENT_NATURAL_ATTRIBUTE}]`);
      return viewport && natural ? { viewport, natural } : null;
    };

    const measure = () => {
      frame = null;
      const target = findTarget();
      const next = target ? [target.viewport, target.natural] : [];
      if (next.some((element, index) => element !== observed[index]) || next.length !== observed.length) {
        resizeObserver.disconnect();
        for (const element of next) resizeObserver.observe(element);
        observed = next;
      }
      if (!target) return;

      const slack = target.viewport.getBoundingClientRect().height - target.natural.getBoundingClientRect().height;
      if (Math.abs(slack) < SLACK_TOLERANCE_PX) return;
      report(sectionId, slack);
    };

    const scheduleMeasure = () => {
      frame ??= requestAnimationFrame(measure);
    };

    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(body, { childList: true, subtree: true });
    scheduleMeasure();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [bodyRef, enabled, itemId, report, sectionId]);
};

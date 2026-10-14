import { useEffect, useRef, useState } from "react";
import { Alert, Box } from "@mantine/core";
import type { FitAddon } from "@xterm/addon-fit";
import type { ITerminalAddon, Terminal } from "@xterm/xterm";

import type { LoggerMessage, LogLevel } from "@homarr/core/infrastructure/logs/constants";
import { LOG_HISTORY_MAX_ENTRIES } from "@homarr/core/infrastructure/logs/constants";
import { useI18n } from "@homarr/translation/standalone/client";

import terminalStyles from "@xterm/xterm/css/xterm.css?inline";

import { useOperationsLogContext } from "./log-context";
import classes from "./terminal.module.css";

const terminalScrollbackLines = LOG_HISTORY_MAX_ENTRIES * 20;

function getFocusMarker(
  messages: readonly LoggerMessage[],
  visibleMessages: readonly LoggerMessage[],
  focusTimestamp: number | undefined,
  markerText: string,
  expiredMarkerText: string,
) {
  if (focusTimestamp === undefined) return null;
  const oldestTimestamp = messages[0]?.timestamp.getTime();
  if (oldestTimestamp === undefined || focusTimestamp < oldestTimestamp) return { index: 0, text: expiredMarkerText };
  return {
    index: visibleMessages.findLastIndex((message) => message.timestamp.getTime() <= focusTimestamp) + 1,
    text: markerText,
  };
}

function findMarkerLine(terminal: Terminal, linesFromEnd: number) {
  const buffer = terminal.buffer.active;
  const logicalLineStarts: number[] = [];
  const cursorLine = buffer.baseY + buffer.cursorY;
  for (let index = 0; index <= cursorLine; index++) {
    const line = buffer.getLine(index);
    if (!line) continue;
    if (!line.isWrapped) logicalLineStarts.push(index);
  }
  return logicalLineStarts.at(-linesFromEnd) ?? null;
}

function renderMessages({
  terminal,
  messages,
  activeLevels,
  focusTimestamp,
  markerText,
  expiredMarkerText,
}: {
  terminal: Terminal;
  messages: readonly LoggerMessage[];
  activeLevels: readonly LogLevel[];
  focusTimestamp: number | undefined;
  markerText: string;
  expiredMarkerText: string;
}) {
  const activeLevelSet = new Set(activeLevels);
  const visibleMessages = messages.filter((message) => activeLevelSet.has(message.level));
  const focusMarker = getFocusMarker(messages, visibleMessages, focusTimestamp, markerText, expiredMarkerText);
  const output: string[] = [];
  let markerOutputIndex: number | null = null;
  visibleMessages.forEach((message, index) => {
    if (focusMarker?.index === index) {
      markerOutputIndex = output.length;
      output.push(`\x1b[33m--- ${focusMarker.text} ---\x1b[0m`);
    }
    output.push(message.message);
  });
  if (focusMarker?.index === visibleMessages.length) {
    markerOutputIndex = output.length;
    output.push(`\x1b[33m--- ${focusMarker.text} ---\x1b[0m`);
  }
  let markerLinesFromEnd: number | null = null;
  if (markerOutputIndex !== null) {
    markerLinesFromEnd =
      1 + output.slice(markerOutputIndex).reduce((count, line) => count + line.split(/\r?\n/).length, 0);
  }
  terminal.write(`\x1bc${output.join("\r\n")}${output.length > 0 ? "\r\n" : ""}`, () => {
    if (markerLinesFromEnd === null) {
      terminal.scrollToBottom();
      return;
    }
    const markerLine = findMarkerLine(terminal, markerLinesFromEnd);
    if (markerLine !== null) terminal.scrollToLine(markerLine);
  });
}

export interface OperationsTerminalProps {
  messages: readonly LoggerMessage[];
  updateKind?: "history" | "message";
  historyIdentity?: object;
  focusTimestamp?: number;
  createRendererAddon?: () => ITerminalAddon;
}

export function OperationsTerminal({
  messages,
  updateKind,
  historyIdentity,
  focusTimestamp,
  createRendererAddon,
}: OperationsTerminalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { activeLevels, fontSize } = useOperationsLogContext();
  const t = useI18n();
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [error, setError] = useState<unknown>(null);
  const current = useRef({
    messages,
    historyIdentity,
    activeLevels,
    fontSize,
    focusTimestamp,
    markerText: "",
    expiredMarkerText: "",
  });
  const previousMessages = useRef<readonly LoggerMessage[]>([]);
  const previousHistoryIdentity = useRef<object | undefined>(undefined);
  current.current = {
    messages: messages.slice(-LOG_HISTORY_MAX_ENTRIES),
    historyIdentity,
    activeLevels,
    fontSize,
    focusTimestamp,
    markerText: t("log.context.widgetError"),
    expiredMarkerText: t("log.context.expiredWidgetError"),
  };

  useEffect(() => {
    let active = true;
    let observer: ResizeObserver | undefined;
    let fitTimeout: number | undefined;
    setError(null);
    void Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")])
      .then(([{ Terminal: TerminalConstructor }, { FitAddon: FitAddonConstructor }]) => {
        if (!active || !ref.current) return;
        const terminal = new TerminalConstructor({
          cursorBlink: false,
          disableStdin: true,
          convertEol: true,
          fontSize: current.current.fontSize,
          scrollback: terminalScrollbackLines,
        });
        terminalRef.current = terminal;
        terminal.open(ref.current);
        if (createRendererAddon) terminal.loadAddon(createRendererAddon());
        const fitAddon = new FitAddonConstructor();
        fitAddonRef.current = fitAddon;
        terminal.loadAddon(fitAddon);
        fitTimeout = window.setTimeout(() => {
          if (!active) return;
          fitAddon.fit();
          renderMessages({ terminal, ...current.current });
          previousMessages.current = current.current.messages;
          previousHistoryIdentity.current = current.current.historyIdentity;
        });
        observer = new ResizeObserver(() => {
          if (active) fitAddon.fit();
        });
        observer.observe(ref.current);
      })
      .catch((failure: unknown) => {
        if (active) setError(failure);
      });
    return () => {
      active = false;
      window.clearTimeout(fitTimeout);
      observer?.disconnect();
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      previousMessages.current = [];
      previousHistoryIdentity.current = undefined;
    };
  }, [createRendererAddon]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    const latest = current.current.messages;
    const lastPrevious = previousMessages.current.at(-1);
    const previousIndex = latest.findLastIndex((message) => message.id === lastPrevious?.id);
    if (
      previousHistoryIdentity.current === historyIdentity &&
      updateKind !== "history" &&
      lastPrevious &&
      previousIndex >= 0
    ) {
      for (const next of latest.slice(previousIndex + 1)) {
        if (current.current.activeLevels.includes(next.level)) terminal.writeln(next.message);
      }
    } else {
      renderMessages({ terminal, ...current.current });
    }
    previousMessages.current = latest;
    previousHistoryIdentity.current = historyIdentity;
  }, [messages, updateKind, historyIdentity]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.options.fontSize = fontSize;
    fitAddonRef.current?.fit();
  }, [fontSize]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (terminal) renderMessages({ terminal, ...current.current });
  }, [activeLevels, focusTimestamp, t]);

  return (
    <>
      <style>{terminalStyles}</style>
      {error !== null && (
        <Alert color="red" role="alert">
          {error instanceof Error ? error.message : t("common.error")}
        </Alert>
      )}
      <Box ref={ref} id="terminal" className={classes.outerTerminal} h="100%" />
    </>
  );
}

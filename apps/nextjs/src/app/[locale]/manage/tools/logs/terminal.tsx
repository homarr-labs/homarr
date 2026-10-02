"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mantine/core";
import { CanvasAddon } from "@xterm/addon-canvas";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

import { clientApi } from "@homarr/api/client";
import type { LoggerMessage, LogLevel } from "@homarr/core/infrastructure/logs/constants";
import { LOG_HISTORY_MAX_ENTRIES, logLevels } from "@homarr/core/infrastructure/logs/constants";
import { useI18n } from "@homarr/translation/client";

import { useLogContext } from "./log-context";
import classes from "./terminal.module.css";

const ALL_LOG_LEVELS = [...logLevels];
const TERMINAL_SCROLLBACK_LINES = LOG_HISTORY_MAX_ENTRIES * 20;

const getFocusMarker = (
  messages: LoggerMessage[],
  visibleMessages: LoggerMessage[],
  focusTimestamp: number | undefined,
  markerText: string,
  expiredMarkerText: string,
) => {
  if (focusTimestamp === undefined) return null;

  const oldestTimestamp = messages[0]?.timestamp.getTime();
  if (oldestTimestamp === undefined || focusTimestamp < oldestTimestamp) {
    return { index: 0, text: expiredMarkerText };
  }

  return {
    index: visibleMessages.findLastIndex((message) => message.timestamp.getTime() <= focusTimestamp) + 1,
    text: markerText,
  };
};

const findMarkerLine = (terminal: Terminal, linesFromEnd: number) => {
  const buffer = terminal.buffer.active;
  const logicalLineStarts: number[] = [];
  const cursorLine = buffer.baseY + buffer.cursorY;

  for (let index = 0; index <= cursorLine; index++) {
    const line = buffer.getLine(index);
    if (!line) continue;

    if (!line.isWrapped) {
      logicalLineStarts.push(index);
    }
  }

  return logicalLineStarts.at(-linesFromEnd) ?? null;
};

const renderMessages = ({
  terminal,
  messages,
  activeLevels,
  focusTimestamp,
  markerText,
  expiredMarkerText,
}: {
  terminal: Terminal;
  messages: LoggerMessage[];
  activeLevels: LogLevel[];
  focusTimestamp: number | undefined;
  markerText: string;
  expiredMarkerText: string;
}) => {
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
      1 + output.slice(markerOutputIndex).reduce((lineCount, line) => lineCount + line.split(/\r?\n/).length, 0);
  }

  terminal.write(`\x1bc${output.join("\r\n")}${output.length > 0 ? "\r\n" : ""}`, () => {
    if (markerLinesFromEnd === null) {
      terminal.scrollToBottom();
      return;
    }

    const markerLine = findMarkerLine(terminal, markerLinesFromEnd);
    if (markerLine !== null) {
      terminal.scrollToLine(markerLine);
    }
  });
};

interface TerminalComponentProps {
  focusTimestamp?: number;
}

export const TerminalComponent = ({ focusTimestamp }: TerminalComponentProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { activeLevels, fontSize } = useLogContext();
  const t = useI18n();

  const terminalRef = useRef<Terminal>(null);
  const fitAddonRef = useRef<FitAddon>(null);
  const messagesRef = useRef<LoggerMessage[]>([]);
  const initialFontSizeRef = useRef(fontSize);
  const activeLevelsRef = useRef(activeLevels);
  const markerTextRef = useRef("");
  const expiredMarkerTextRef = useRef("");
  const focusTimestampRef = useRef(focusTimestamp);

  activeLevelsRef.current = activeLevels;
  markerTextRef.current = t("log.context.widgetError");
  expiredMarkerTextRef.current = t("log.context.expiredWidgetError");
  focusTimestampRef.current = focusTimestamp;

  const redrawTerminal = () => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    renderMessages({
      terminal,
      messages: messagesRef.current,
      activeLevels: activeLevelsRef.current,
      focusTimestamp: focusTimestampRef.current,
      markerText: markerTextRef.current,
      expiredMarkerText: expiredMarkerTextRef.current,
    });
  };

  clientApi.log.subscribe.useSubscription(
    {
      levels: ALL_LOG_LEVELS,
    },
    {
      onData(event) {
        if (event.type === "history") {
          messagesRef.current = event.messages.slice(-LOG_HISTORY_MAX_ENTRIES);
          redrawTerminal();
          return;
        }

        messagesRef.current.push(event.message);
        if (messagesRef.current.length > LOG_HISTORY_MAX_ENTRIES) {
          messagesRef.current.shift();
        }

        if (activeLevelsRef.current.includes(event.message.level)) {
          terminalRef.current?.writeln(event.message.message);
        }
      },
      onError(err) {
        alert(err);
      },
    },
  );

  useEffect(() => {
    if (!ref.current) {
      return () => undefined;
    }

    const canvasAddon = new CanvasAddon();

    terminalRef.current = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
      fontSize: initialFontSizeRef.current,
      scrollback: TERMINAL_SCROLLBACK_LINES,
    });
    terminalRef.current.open(ref.current);
    terminalRef.current.loadAddon(canvasAddon);

    const fitTimeout = window.setTimeout(() => {
      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      terminalRef.current?.loadAddon(fitAddon);
      fitAddon.fit();
      redrawTerminal();
    });

    return () => {
      window.clearTimeout(fitTimeout);
      canvasAddon.dispose();
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.options.fontSize = fontSize;
    fitAddonRef.current?.fit();
  }, [fontSize]);

  useEffect(() => {
    redrawTerminal();
  }, [activeLevels, focusTimestamp]);

  return <Box ref={ref} id="terminal" className={classes.outerTerminal} h="100%"></Box>;
};

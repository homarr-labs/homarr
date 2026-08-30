import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@mantine/core";

export function createCopyButton(labels: { copy: string; copied: string }) {
  return function SafeCopyButton({ value }: { value?: string; children?: ReactNode }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    const copy = async () => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2_000);
      } catch {
        setCopied(false);
      }
    };
    return (
      <Button
        size="xs"
        variant={copied ? "filled" : "light"}
        color={copied ? "teal" : "blue"}
        onClick={() => void copy()}
      >
        {copied ? labels.copied : labels.copy}
      </Button>
    );
  };
}

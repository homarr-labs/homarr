import { useLocation } from "@docusaurus/router";
import React, { useEffect } from "react";

export function Carbon() {
  const ref = React.useRef<HTMLDivElement>(null!);
  const location = useLocation();
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  useEffect(() => {
    const serve = "CWBDTKQM";
    const placement = "homarrdev";
    ref.current.innerHTML = "";
    const s = document.createElement("script");
    s.id = "_carbonads_js";
    s.src = `//cdn.carbonads.com/carbon.js?serve=${serve}&placement=${placement}&format=cover`;
    ref.current.appendChild(s);
  }, [location]);

  return (
    <>
      <div ref={ref} data-visual-test="blackout" className="flex flex-col m-4 space-y-2 argos-ignore" />
    </>
  );
}

// Variant 1: Strict re-initialization – remove prior scripts and injected nodes, then load cover
export function CarbonCoverStrict() {
  const ref = React.useRef<HTMLDivElement>(null!);
  const location = useLocation();
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  useEffect(() => {
    const serve = "CWBDTKQM";
    const placement = "homarrdev";

    // Clear our local container
    ref.current.innerHTML = "";

    // Remove any globally injected Carbon ad containers
    Array.from(document.querySelectorAll('[id^="carbonads"], .carbonads')).forEach(
      (el) => el.parentElement && el.parentElement.removeChild(el),
    );

    // Remove existing script if present
    const existing = document.getElementById("_carbonads_js");
    if (existing && existing.parentElement) existing.parentElement.removeChild(existing);

    // Reset possible global handle
    try {
      delete (window as any)._carbonads;
    } catch {}

    // Inject fresh cover script into our container
    const s = document.createElement("script");
    s.id = "_carbonads_js";
    s.src = `https://cdn.carbonads.com/carbon.js?serve=${serve}&placement=${placement}&format=cover`;
    ref.current.appendChild(s);
  }, [location]);

  return (
    <>
      <style>
        {`
					#carbon-responsive-wrap * { margin: initial; padding: initial; }
				`}
      </style>
      <div
        ref={ref}
        id="carbonads"
        data-selector="carbonads"
        className="bg-background flex flex-col m-4 space-y-2 carbonads argos-ignore"
      />
    </>
  );
}

// Variant 2: Observer – load cover then keep only the latest injected ad node
export function CarbonCoverObserver() {
  const ref = React.useRef<HTMLDivElement>(null!);
  const location = useLocation();
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  useEffect(() => {
    const serve = "CWBDTKQM";
    const placement = "homarrdev";

    ref.current.innerHTML = "";

    const s = document.createElement("script");
    s.id = "_carbonads_js";
    s.src = `https://cdn.carbonads.com/carbon.js?serve=${serve}&placement=${placement}&format=cover`;
    ref.current.appendChild(s);

    // Observe body and ensure we keep only the most recent carbon container
    const trim = () => {
      const nodes = Array.from(document.querySelectorAll('[id^="carbonads"]')) as HTMLElement[];
      if (nodes.length > 1) {
        // Keep the last (most recently inserted); remove the rest
        nodes.slice(0, -1).forEach((n) => n.parentElement && n.parentElement.removeChild(n));
      }
    };

    const observer = new MutationObserver(() => trim());
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial pass
    trim();

    return () => observer.disconnect();
  }, [location]);

  return (
    <>
      <style>
        {`
					#carbon-responsive-wrap * { margin: initial; padding: initial; }
				`}
      </style>
      <div
        ref={ref}
        id="carbonads"
        data-selector="carbonads"
        className="bg-background flex flex-col m-4 space-y-2 carbonads argos-ignore"
      />
    </>
  );
}

// Variant 3: CSS-only – hide the first instance so only the second (cover) remains visible
export function CarbonCoverCssOnlySecond() {
  const ref = React.useRef<HTMLDivElement>(null!);
  const location = useLocation();
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  useEffect(() => {
    const serve = "CWBDTKQM";
    const placement = "homarrdev";
    ref.current.innerHTML = "";
    const s = document.createElement("script");
    s.id = "_carbonads_js";
    s.src = `https://cdn.carbonads.com/carbon.js?serve=${serve}&placement=${placement}&format=cover`;
    ref.current.appendChild(s);
  }, [location]);

  return (
    <>
      <style>
        {`
					/* Hide the first injected container; show subsequent one (cover) */
					#carbon-responsive-wrap { display: none; }
					#carbon-responsive-wrap * { margin: initial; padding: initial; }
				`}
      </style>
      <div
        ref={ref}
        id="carbonads"
        data-selector="carbonads"
        className="bg-background flex flex-col m-4 space-y-2 carbonads argos-ignore"
      />
    </>
  );
}

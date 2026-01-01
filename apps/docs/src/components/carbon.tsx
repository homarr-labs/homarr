/** biome-ignore-all lint/complexity/useOptionalChain: <explanation> */
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
      <style>
        {`
					#carbonads_1 { display: none; }
					#carbonads * { margin: initial; padding: initial; }
					#carbonads {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
							Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', Helvetica, Arial,
							sans-serif;
						display: flex;
					}
					#carbonads a {
						text-decoration: none;
						color: inherit;
					}
					#carbonads span {
						position: relative;
						display: block;
						overflow: hidden;
						width: 100%;
					}
					#carbonads .carbon-wrap {
						display: flex;
						flex-direction: column;
					}
					#carbonads .carbon-img {
						display: block;
						margin: 0;
						line-height: 1;
					}
					#carbonads .carbon-img img {
						display: block;
						height: 100%;
						max-width: 100% !important;
						width: 100%;
						border-radius: 4px;
					}
					#carbonads .carbon-text {
						font-size: 11px;
						padding: 10px;
						margin-bottom: 16px;
						line-height: 1.5;
						text-align: left;
					}
					#carbonads .carbon-poweredby {
						display: block;
						padding: 6px 8px;
						text-align: center;
						text-transform: uppercase;
						letter-spacing: 0.5px;
						font-weight: 600;
						font-size: 8px;
						line-height: 1;
						border-top-left-radius: 3px;
						position: absolute;
						bottom: 0;
						right: 0;
						background: rgba(128, 128, 128, 0.1);
					}
				`}
      </style>
      <div
        ref={ref}
        data-visual-test="blackout"
        id="carbonads"
        data-selector="carbonads"
        className="bg-background flex flex-col m-4 space-y-2 carbonads argos-ignore"
      />
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
      // biome-ignore lint/suspicious/noEmptyBlockStatements: <we want to catch the error>
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
					#carbonads * { margin: initial; padding: initial; }
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
					#carbonads * { margin: initial; padding: initial; }
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
					#carbonads { display: none; }
					#carbonads * { margin: initial; padding: initial; }
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

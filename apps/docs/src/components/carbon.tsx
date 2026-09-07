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

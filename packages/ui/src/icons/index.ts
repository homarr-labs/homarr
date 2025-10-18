import { createCustomIcon } from "./create";

export const IconPowerOff = createCustomIcon({
  svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-power-off">
        <path xmlns="http://www.w3.org/2000/svg" d="M3 3l18 18"/>
	<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
	<path d="M7 6a7.75 7.75 0 1 0 10 0" />
	<path d="M12 4l0 4" />
</svg>`,
  type: "outline",
  name: "power-off",
});

export const IconWebsocket = createCustomIcon({
  svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 193" fill="currentColor">
  <path xmlns="http://www.w3.org/2000/svg" d="M192 145h32V68l-36-35-22 22 26 27zm32 16H113l-26-27 11-11 22 22h45l-44-45 11-11 44 44V88l-21-22 11-11-55-55H0l32 32h65l24 23-34 34-24-23V48H32v31l55 55-23 22 36 36h156z"/>
</svg>`,
  type: "filled",
  name: "websocket",
});

// Lucide icons (ISC / MIT)
export const IconMemoryStick = createCustomIcon({
  svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-memory-stick-icon lucide-memory-stick"><path d="M6 19v-3"/><path d="M10 19v-3"/><path d="M14 19v-3"/><path d="M18 19v-3"/><path d="M8 11V9"/><path d="M16 11V9"/><path d="M12 11V9"/><path d="M2 15h20"/><path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837Z"/></svg>`,
  type: "outline",
  name: "memory-stick",
});

// Lucide icons (ISC / MIT)
export const IconHardDrive = createCustomIcon({
  svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hard-drive-icon lucide-hard-drive"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></svg>`,
  type: "outline",
  name: "hard-drive",
});

// Huge icons (MIT)
export const IconGpu = createCustomIcon({
  svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
			<path xmlns="http://www.w3.org/2000/svg" d="M4 21V4.1a1.5 1.5 0 0 0-1.1-1L2 3m2 2h13c2.4 0 3.5 0 4.3.7s.7 2 .7 4.3v4.5c0 2.4 0 3.5-.7 4.3-.8.7-2 .7-4.3.7h-4.9a1.8 1.8 0 0 1-1.6-1c-.3-.6-1-1-1.6-1H4" />
			<path xmlns="http://www.w3.org/2000/svg" d="M19 11.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0m-11.5-3h2m-2 3h2m-2 3h2" />
		</svg>`,
  type: "outline",
  name: "gpu",
});

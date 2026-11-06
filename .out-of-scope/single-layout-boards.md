# Single-layout boards

Every board keeps both a Base layout and a Mobile layout. Hiding, disabling or deleting either of them is not supported, even for boards that are only ever opened on one kind of device.

## Why this is out of scope

A board is responsive: the viewer's width picks the layout, and the Mobile layout is what keeps a desktop board usable when someone opens it on a phone. Validation requires exactly one Base and one Mobile layout per board, and the Mobile layout is generated automatically from Base, so an unused layout costs nothing to keep.

Allowing a single-layout board would mean deciding what a phone shows when the Mobile layout is gone (a squeezed desktop grid, a blank board, or a redirect), and every layout-aware feature would need a "missing layout" path. The only gain is one fewer entry in board settings.

People who keep separate desktop and phone boards can simply ignore the layout they don't use. Custom layouts beyond Base and Mobile remain removable.

## Prior requests

- #7379: "Option to Hide Unused Layouts in Board Settings"

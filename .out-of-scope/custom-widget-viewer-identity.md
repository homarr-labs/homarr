# Viewer identity in Custom Widgets

Custom Widgets do not receive information about who is viewing the board: no username, display name, groups or permissions.

## Why this is out of scope

Custom Widget code is often written by someone else and installed from the Workshop. Giving it the viewer's identity would hand personal data to third-party code that admins approve for its requests, not for access to their users. Once a widget can read identity, it can also send it to any source it is allowed to call.

It would also make one widget behave differently per viewer. That breaks shared caching, and a board would no longer look the same to everyone who can open it.

Per-viewer content already has a supported path: build separate boards, or use board and item permissions to control what each group sees. An earlier viewer-context prototype (#7078) was closed without merging.

## Prior requests

- #7233: "Explore explicit viewer context for Custom Widgets"

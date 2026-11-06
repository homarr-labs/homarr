# Viewer identity in Custom Widgets

Custom Widgets do not receive information about who is viewing the board: no username, display name, groups or permissions.

## Why this is out of scope

Custom Widget code is often written by someone else and installed from the Workshop. Giving it the viewer's identity would hand personal data to third-party code that admins approve for its requests, not for access to their users. Once a widget can read identity, it can also send it to any source it is allowed to call. No concrete use case currently justifies that exposure.

If upstream responses depend on viewer identity, their cache keys would need to separate viewers to avoid sharing personal responses. Viewer-dependent rendering alone does not prevent shared caching.

Per-viewer content already has a supported path: build separate boards and use board permissions to control which groups can view them. An earlier viewer-context prototype (#7078) was closed without merging.

## Prior requests

- [#7233](https://github.com/homarr-labs/homarr/issues/7233): "Explore explicit viewer context for Custom Widgets"

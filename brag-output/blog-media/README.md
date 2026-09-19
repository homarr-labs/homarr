# Release blog media

Eight silent 60 fps clips copied from the verified isolated local captures, with WebP posters and English WebVTT descriptions. Four added screenshots show a running Custom Widget, the customized header, Air Quality and Countdown. No concept mockups or open-PR Statistics footage is added to the release blog.

All eight clips played and sought successfully over Tailscale. Posters and caption tracks returned HTTP 200. Desktop and 390 px mobile viewports have no horizontal overflow or missing images; browser error list is empty.

The target blog MDX and media compiled and rendered. The full docs build fails on 101 other routes with ReactContextError in useTitleFormatterContext/useColorMode, using dependencies borrowed from /home/habs/work/homarr. A complete clean-environment docs build is not verified. Formatting and git diff checks pass.

Preview: http://100.111.30.70:3020/blog/2026/09/03/homarr-2.0/?media=2#goodbye-groups-and-sections-bonjour-containers

The preview is served locally; no public deployment, push or PR was performed.

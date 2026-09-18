# Next media stats fixtures

`next-media.compose.yaml` runs Jellystat, Komga, and Tube Archivist for live stats validation. Set `NEXT_MEDIA_DATA_ROOT` to `/tmp/homarr-stats-live/next-media/data` (or another disposable absolute path) before starting it. All service state is bind-mounted below that directory; the compose file does not create named volumes.

The first run requires the normal web setup for each service. Create an API key in Jellystat, a Komga API key, and a Tube Archivist API token. Keep those values in the private validation manifest under `/tmp/homarr-stats-live`; never commit them here.

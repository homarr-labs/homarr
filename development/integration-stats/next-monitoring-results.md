# Monitoring runtime validation

Scrutiny, Frigate, and NetAlertX passed authenticated Homarr connection, catalog, and forced refresh checks. Scrutiny and Frigate intentionally have no attached physical disks or cameras, so zero inventories do not prove hardware monitoring.

NetAlertX is pinned to `jokobsk/netalertx:26.8.5` and runs its real Python backend directly. Its stock PHP-FPM process cannot open regular configuration files on this host, including an untouched image's default configuration (syscall trace: `open(..., O_RDONLY) = EACCES`). Changing volume ownership and testing the previous release did not fix it. The fixture therefore validates the API only; its web UI is not running. Its healthcheck tests the backend listener.

All published ports bind to localhost. NetAlertX scan plugins are disabled in its private app.conf. No host network mode, host disks, or real camera feeds are attached.

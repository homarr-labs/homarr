# Next monitoring fixtures

These files are intentionally minimal fixtures for the real-service statistics
validation stack. They do not attach host disks, cameras, or network interfaces.

Scrutiny can start and answer its API without a physical SMART device, but it
cannot produce a meaningful disk inventory or health result in this environment.
NetAlertX has active scanning disabled; its totals require records ingested by
the service or an externally prepared database. Frigate starts with no cameras.

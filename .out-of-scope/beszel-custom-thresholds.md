# Custom Beszel colour thresholds

The Beszel widgets colour usage values with fixed thresholds: yellow from 65% and red from 90%. Per-widget or per-metric threshold settings are not supported.

## Why this is out of scope

The thresholds match Beszel's own interface, so a system looks the same in Homarr as in Beszel. Configurable limits would add Off, Standard and Custom modes with a limit per metric to three widgets (Grid, Table and Stats), for a cosmetic difference.

Beszel already has per-system alerting with its own thresholds. That is the right place for "this machine is in trouble at 80%", and it notifies people instead of only changing a colour.

## Prior requests

- #7214: "feat(beszel): configure metric color thresholds"

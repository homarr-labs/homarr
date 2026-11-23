"use client";

import { Modal } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import { getDeviceBattery, getDeviceEntityLabel, isDeviceOffline, isLowBattery } from "../device-groups";
import type { DevicePanelItem } from "../device-groups";
import { formatEntityState, formatRelativeTime } from "../semantics";
import { useSmartHomeAreas, useSmartHomeInteractionBlock } from "../store";
import { isSensorLike } from "../technical/meta";
import type { HaEntity } from "../types";
import { entityNeedsCode } from "./capabilities";
import { CodePrompt } from "./code-prompt";
import { Sparkline } from "./controls";
import { EntityControl } from "./entity-controls";
import { getHistoryValues } from "./history";
import { DetailProvider, Measured } from "./hooks";
import classes from "./styles.module.css";
import { useEntityTheme } from "./theme";

/** The entity under the name the device card uses for it: the card's name for the main entity, else its part name. */
const asShown = (entity: HaEntity, device: DevicePanelItem): HaEntity => ({
  ...entity,
  name: entity === device.primary ? device.name : getDeviceEntityLabel(entity),
});

function MeasurementRow({ entity }: { entity: HaEntity }) {
  const theme = useEntityTheme(entity);
  const Icon = theme.Icon;
  const history = entity.history ?? [];
  const trend = getHistoryValues(history).length > 1;
  return (
    <li className={classes.deviceDetailReading}>
      <Icon size={16} stroke={1.8} className={classes.deviceReadingIcon} aria-hidden />
      <span className={classes.deviceReadingName}>{getDeviceEntityLabel(entity)}</span>
      <span className={classes.deviceDetailSpark} aria-hidden>
        {trend ? <Sparkline values={history} color={theme.accent} /> : null}
      </span>
      <span className={classes.deviceReadingValue}>{formatEntityState(entity)}</span>
    </li>
  );
}

interface DeviceDetailProps {
  device: DevicePanelItem;
  opened: boolean;
  onClose: () => void;
}

/** Everything a device offers in one place: its controls side by side and every measurement with its trend. */
export function DeviceDetail({ device, opened, onClose }: DeviceDetailProps) {
  const t = useI18n("widget.smartHome-controls.device");
  const tCommon = useI18n();
  const areas = useSmartHomeAreas();
  const editing = useSmartHomeInteractionBlock() === "editing";
  const entities = [device.primary, ...device.readings];
  const controls = entities.filter((entity) => !isSensorLike(entity));
  const measurements = entities.filter(isSensorLike);
  const area = areas.find((candidate) => candidate.id === device.primary.areaId)?.name;
  const battery = getDeviceBattery(device);
  const offline = isDeviceOffline(device);
  const meta = [
    area,
    device.primary.device?.model,
    offline ? t("offline", { time: formatRelativeTime(device.primary.lastChanged) }) : t("online"),
    battery === null ? null : t(isLowBattery(battery) ? "batteryLow" : "battery", { level: Math.round(battery) }),
  ].filter(Boolean);

  return (
    <Modal
      opened={opened && !editing}
      onClose={onClose}
      title={device.name}
      closeButtonProps={{ "aria-label": tCommon("common.action.close"), size: 44 }}
      centered
      size="60rem"
      xOffset="max(12px, env(safe-area-inset-left), env(safe-area-inset-right))"
      yOffset="max(12px, env(safe-area-inset-top), env(safe-area-inset-bottom))"
      classNames={{ content: classes.detailModal, title: classes.detailModalTitle }}
    >
      {opened && !editing ? (
        <DetailProvider value={null}>
          <div className={classes.root} data-preset="detail">
            <p className={classes.detailMeta}>{meta.join(" · ")}</p>
            {controls.length > 0 && (
              <div className={classes.deviceDetailGrid}>
                {controls.map((entity) => (
                  <div
                    key={entity.id}
                    className={classes.deviceDetailCell}
                    data-main={entity === device.primary}
                    data-code={entityNeedsCode(entity)}
                  >
                    {/* Locks and alarms that need a code ask for it here, as their own details do; closing the
                        dialog clears it. */}
                    <CodePrompt entity={entity}>
                      <Measured>
                        {(width, height) => (
                          <EntityControl
                            entity={asShown(entity, device)}
                            width={width}
                            height={height}
                            details={false}
                          />
                        )}
                      </Measured>
                    </CodePrompt>
                  </div>
                ))}
              </div>
            )}
            {measurements.length > 0 && (
              <ul className={classes.deviceDetailReadings}>
                {measurements.map((entity) => (
                  <MeasurementRow key={entity.id} entity={entity} />
                ))}
              </ul>
            )}
          </div>
        </DetailProvider>
      ) : null}
    </Modal>
  );
}

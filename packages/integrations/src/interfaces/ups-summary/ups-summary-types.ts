export interface UpsSummary {
  /** Stable identifier of the UPS device on the NUT server */
  id: string;
  /** Human readable name, derived from the manufacturer and model */
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  /** Raw NUT `ups.status` value, a space separated set of flags (e.g. "OL CHRG") */
  status: string;
  /** Battery charge in percent */
  batteryCharge: number | null;
  /** Estimated remaining runtime on battery, in seconds */
  batteryRuntime: number | null;
  batteryVoltage: number | null;
  /** UPS load in percent */
  load: number | null;
  inputVoltage: number | null;
  outputVoltage: number | null;
  /** Real power drawn by the load, in watts */
  power: number | null;
  /** UPS temperature in degrees celsius */
  temperature: number | null;
}

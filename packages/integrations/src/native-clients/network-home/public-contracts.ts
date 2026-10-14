import type { AdGuardHomeIntegration } from "../../adguard-home/adguard-home-integration";
import type { GluetunIntegration } from "../../gluetun/gluetun-integration";
import type { HomeAssistantIntegration } from "../../homeassistant/homeassistant-integration";
import type { OPNsenseIntegration } from "../../opnsense/opnsense-integration";
import type { PeaNutIntegration } from "../../peanut/peanut-integration";
import type { PiHoleIntegrationV5 } from "../../pi-hole/v5/pi-hole-integration-v5";
import type { PiHoleIntegrationV6 } from "../../pi-hole/v6/pi-hole-integration-v6";
import type { TechnitiumDnsIntegration } from "../../technitium/technitium-integration";
import type { UnifiControllerIntegration } from "../../unifi-controller/unifi-controller-integration";
import type { AdGuardHomeProtocol } from "./adguard-home";
import type { GluetunProtocol } from "./gluetun";
import type { HomeAssistantProtocol } from "./home-assistant";
import type { OPNsenseProtocol } from "./opnsense";
import type { PeaNutProtocol } from "./peanut";
import type { PiHoleV5Protocol } from "./pi-hole-v5";
import type { PiHoleV6Protocol } from "./pi-hole-v6";
import type { TechnitiumDnsProtocol } from "./technitium";
import type { UnifiControllerProtocol } from "./unifi-controller";

type Public<T> = Pick<T, keyof T>;
type PublicParity<Expected, Actual extends Expected> = Public<Actual>;

export type NetworkHomePublicContracts = {
  piHoleV5: PublicParity<Public<PiHoleIntegrationV5>, PiHoleV5Protocol>;
  piHoleV6: PublicParity<Public<PiHoleIntegrationV6>, PiHoleV6Protocol>;
  adGuardHome: PublicParity<Public<AdGuardHomeIntegration>, AdGuardHomeProtocol>;
  technitiumDns: PublicParity<Public<TechnitiumDnsIntegration>, TechnitiumDnsProtocol>;
  homeAssistant: PublicParity<Public<HomeAssistantIntegration>, HomeAssistantProtocol>;
  unifiController: PublicParity<Public<UnifiControllerIntegration>, UnifiControllerProtocol>;
  opnsense: PublicParity<Public<OPNsenseIntegration>, OPNsenseProtocol>;
  gluetun: PublicParity<Public<GluetunIntegration>, GluetunProtocol>;
  peaNut: PublicParity<Public<PeaNutIntegration>, PeaNutProtocol>;
};

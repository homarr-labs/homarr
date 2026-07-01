import { WidgetDefinition } from "@site/src/types";
import { IconShieldLock } from "@tabler/icons-react";

export const vpnWidget: WidgetDefinition = {
  icon: IconShieldLock,
  name: "VPN",
  description: "Monitor the connection status, public IP, and provider details of your VPN integrations.",
  data: "Displays VPN connection status including interface, bytes transferred, handshake time, and endpoint info.",
  path: "../../widgets/vpn",
};

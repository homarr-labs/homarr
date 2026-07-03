import { WidgetDefinition } from "@site/src/types";
import { IconShieldLock } from "@tabler/icons-react";

export const vpnWidget: WidgetDefinition = {
  icon: IconShieldLock,
  name: "VPN",
  description: "Monitor the connection status, public IP, and provider details of your VPN integrations.",
  path: "../../widgets/vpn",
};

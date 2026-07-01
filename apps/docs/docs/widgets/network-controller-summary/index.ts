import { WidgetDefinition } from "@site/src/types";
import { IconTopologyFull } from "@tabler/icons-react";

export const networkControllerSummaryWidget: WidgetDefinition = {
  icon: IconTopologyFull,
  name: "Network Controller Summary",
  description: "Displays the summary of a Network Controller",
  data: "Displays UniFi network controller status including WAN, internet, Wi-Fi, and VPN connectivity.",
  path: "../../widgets/network-controller-summary",
};

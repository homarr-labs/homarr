import type { Metadata } from "next";
import { Homarr3dLab } from "./homarr-3d-lab";

export const metadata: Metadata = {
  title: "Homarr 3D Lab",
  description: "An interactive three-dimensional study of the Homarr lobster.",
};

export default function Homarr3dLabPage() {
  return <Homarr3dLab />;
}

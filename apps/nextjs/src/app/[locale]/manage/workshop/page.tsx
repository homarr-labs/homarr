import { permanentRedirect } from "next/navigation";

/** The Workshop now lives as a tab of the Custom Widgets page. */
export default function WorkshopPage(): never {
  permanentRedirect("/manage/custom-widgets/workshop");
}

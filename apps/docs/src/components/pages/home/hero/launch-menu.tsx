import { Menu } from "@base-ui/react/menu";
import useBaseUrl from "@docusaurus/useBaseUrl";
import { IconChevronDown, IconExternalLink } from "@tabler/icons-react";
import styles from "./launch-menu.module.css";

const providers = [
  { name: "PikaPods", logo: "pikapods", href: "https://www.pikapods.com/pods?run=homarr" },
  { name: "Railway", logo: "railway", href: "https://railway.com/deploy/_c4Kr9?referralCode=vishify" },
  { name: "Hostinger", logo: "hostinger", href: "https://www.hostinger.com/applications/homarr" },
];

export function LaunchMenu() {
  const logoBase = useBaseUrl("/img/pictures/partner/");

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className={styles.trigger}>
        <span className={styles.label}>Launch</span>
        <span className={styles.chevron} aria-hidden="true">
          <IconChevronDown size={18} />
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className={styles.positioner} sideOffset={8} align="end" collisionPadding={12}>
          <Menu.Popup className={styles.popup} aria-label="Hosting providers">
            {providers.map((provider) => (
              <Menu.Item
                key={provider.name}
                className={styles.item}
                nativeButton={false}
                render={<a href={provider.href} aria-label={provider.name} />}
                data-attr={`Redirect to ${provider.name}`}
              >
                <span className={styles.logo}>
                  <img src={`${logoBase}${provider.logo}.png`} alt="" width={24} height={24} />
                </span>
                <span className={styles.providerName}>{provider.name}</span>
                <IconExternalLink className={styles.externalIcon} size={16} aria-hidden="true" />
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

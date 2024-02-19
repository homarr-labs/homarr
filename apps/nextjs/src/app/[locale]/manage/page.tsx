import { getScopedI18n } from "@homarr/translation/server";
import { Title } from "@homarr/ui";
import {logger} from '@homarr/log';

export async function generateMetadata() {
  const t = await getScopedI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default async function ManagementPage() {
  const t = await getScopedI18n("management.title");

  logger.info('test!!!, info');
  logger.warn('test!!!, warn');
  logger.error('test!!, error');

  const dateNow = new Date();
  const timeOfDay =
    dateNow.getHours() < 10
      ? "morning"
      : dateNow.getHours() < 17
        ? "afternoon"
        : "evening";



  return (
    <>
      <Title>{t(timeOfDay, { username: "admin" })}</Title>
    </>
  );
}

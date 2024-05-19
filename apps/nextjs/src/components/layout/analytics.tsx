import { api } from "@homarr/api/server"
import Script from "next/script";
import { UMAMI_WEBSITE_ID } from "@homarr/analytics";

export const Analytics = async () => {
    const analytics = await api.serverSettings.getAnalytics();

    if (analytics.enableGeneral) {
        return <Script src="https://umami.homarr.dev/script.js" data-website-id={UMAMI_WEBSITE_ID} defer />
    }

    return <></>
}

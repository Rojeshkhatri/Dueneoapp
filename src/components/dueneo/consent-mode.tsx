"use client";

import * as React from "react";

/**
 * Google Consent Mode v2 — sets default consent state before any
 * Google tags load. Updates to "granted" when user accepts via CMP.
 *
 * Required for EU GDPR/ePrivacy compliance with AdSense.
 */
export function ConsentMode() {
  React.useEffect(() => {
    // Set default consent state (all denied for EU)
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    }
    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted",
      wait_for_update: 500,
    });
    gtag("set", "ads_data_redaction", true);
  }, []);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag("consent","default",{
            ad_storage:"denied",
            ad_user_data:"denied",
            ad_personalization:"denied",
            analytics_storage:"denied",
            functionality_storage:"denied",
            personalization_storage:"denied",
            security_storage:"granted",
            wait_for_update:500
          });
          gtag("set","ads_data_redaction",true);
        `,
      }}
    />
  );
}

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

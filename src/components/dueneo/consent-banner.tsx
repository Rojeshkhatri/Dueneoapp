"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "dueneo-consent";

type ConsentState = "granted" | "denied";

function getStoredConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === "granted" || val === "denied") return val;
  return null;
}

function updateConsent(state: ConsentState) {
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  gtag("consent", "update", {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
    functionality_storage: state,
    personalization_storage: state,
  });
  localStorage.setItem(CONSENT_KEY, state);
}

export function ConsentBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      updateConsent(stored);
    } else {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 flex-none text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              We use cookies and similar technologies to serve ads and improve
              your experience. By clicking &quot;Accept&quot;, you consent to
              Google AdSense cookies for personalised ads.{" "}
              <a
                href="#/cookie-policy"
                className="text-primary underline underline-offset-2"
              >
                Cookie Policy
              </a>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  updateConsent("granted");
                  setVisible(false);
                  window.location.reload();
                }}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  updateConsent("denied");
                  setVisible(false);
                }}
              >
                Reject
              </Button>
            </div>
          </div>
          <button
            onClick={() => {
              updateConsent("denied");
              setVisible(false);
            }}
            className="flex-none text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

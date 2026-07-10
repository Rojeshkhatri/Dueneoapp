"use client";

import { LegalPage } from "./legal-pages";

const UPDATED = "January 2025";

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      pathname="/privacy-policy"
      lastUpdated={UPDATED}
      crumbs={[{ label: "Privacy Policy" }]}
      description="How Dueneo handles your data — short, plain, and honest."
      sections={[
        {
          heading: "1. The short version",
          body: (
            <p>
              Most Dueneo tools run entirely in your browser. Your files,
              inputs and outputs stay on your device. We do not upload them,
              we do not log them, and we do not send them to third parties.
              When we use third-party ads or analytics, those scripts only see
              what is needed to serve an ad or measure traffic — never your
              tool input.
            </p>
          ),
        },
        {
          heading: "2. Tool inputs are processed locally",
          body: (
            <p>
              For every browser-only tool on Dueneo, the input you provide
              (text, files, images, PDFs, JSON, passwords, JWTs, etc.) is
              processed locally in your browser. Dueneo does not intentionally
              upload tool files or data for browser-only tools. Outputs are
              either displayed on screen or downloaded at your request.
            </p>
          ),
        },
        {
          heading: "3. Local storage",
          body: (
            <p>
              Some tools and games use your browser&apos;s localStorage or
              IndexedDB to remember preferences, game state or statistics
              between visits. This data lives only in your browser. Sensitive
              tools (Password Generator, Password Strength Checker, JWT
              Decoder, hash tools) avoid localStorage by default.
            </p>
          ),
        },
        {
          heading: "4. Cookies",
          body: (
            <p>
              We use a minimal set of cookies for theme preference and consent
              state. Third-party advertising networks (such as Google AdSense
              or Media.net, when enabled) may set their own cookies for ad
              personalisation and frequency capping. See our{" "}
              <a href="/cookie-policy/" className="text-primary hover:underline">
                Cookie Policy
              </a>{" "}
              for details.
            </p>
          ),
        },
        {
          heading: "5. Advertising",
          body: (
            <p>
              Dueneo may display ads served by Google AdSense and/or Media.net.
              These networks may use cookies or similar technologies to serve
              ads based on your prior visits to this and other websites. You
              can opt out of personalised advertising via your browser settings
              or the network&apos;s opt-out page. Ads never see your tool
              input — only ad-related metadata is shared with ad networks.
            </p>
          ),
        },
        {
          heading: "6. Analytics",
          body: (
            <p>
              We may use privacy-focused analytics (such as Cloudflare
              Analytics or Plausible) to understand aggregate traffic. We do
              not track tool input values, file contents, passwords, JWTs,
              invoice details, or any other sensitive tool data. Events we
              track are limited to things like &quot;tool started&quot;,
              &quot;copy clicked&quot; and &quot;game completed&quot;.
            </p>
          ),
        },
        {
          heading: "7. Children",
          body: (
            <p>
              Dueneo is not directed at children under 13 and we do not
              knowingly collect personal information from children.
            </p>
          ),
        },
        {
          heading: "8. Your choices",
          body: (
            <p>
              You can clear your browser&apos;s localStorage and cookies at any
              time. You can disable JavaScript and most tools will still work
              in a degraded form. You can use a content blocker to disable ad
              scripts — the tools will continue to function.
            </p>
          ),
        },
        {
          heading: "9. Changes",
          body: (
            <p>
              We may update this policy from time to time. The &quot;last
              updated&quot; date above reflects the most recent revision.
            </p>
          ),
        },
        {
          heading: "10. Contact",
          body: (
            <p>
              Questions about privacy? Email{" "}
              <a href="mailto:privacy@dueneo.com" className="text-primary hover:underline">
                privacy@dueneo.com
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      pathname="/terms"
      lastUpdated={UPDATED}
      crumbs={[{ label: "Terms" }]}
      description="The ground rules for using Dueneo."
      sections={[
        {
          heading: "1. Acceptance",
          body: (
            <p>
              By using Dueneo you agree to these terms. If you don&apos;t
              agree, please don&apos;t use the site.
            </p>
          ),
        },
        {
          heading: "2. Tools are provided as-is",
          body: (
            <p>
              Dueneo tools are provided &quot;as is&quot; without warranty of
              any kind. We make no guarantees about accuracy, availability, or
              fitness for a particular purpose. You are responsible for
              verifying the output of any tool before relying on it.
            </p>
          ),
        },
        {
          heading: "3. Calculators are estimates",
          body: (
            <p>
              Finance, tax, loan and interest calculators produce estimates
              only. They are not professional financial, tax or legal advice.
              Always consult a qualified professional before making financial
              decisions.
            </p>
          ),
        },
        {
          heading: "4. User responsibility",
          body: (
            <p>
              You are responsible for your use of the tools, including any
              files you process and any output you download or share. Dueneo
              is not liable for any loss or damage arising from tool use.
            </p>
          ),
        },
        {
          heading: "5. Games are entertainment",
          body: (
            <p>
              Games on Dueneo are for entertainment only. There are no prizes,
              no real-money features, no gambling, and no multiplayer servers.
              Game progress is stored locally in your browser and may be lost
              if you clear browser data.
            </p>
          ),
        },
        {
          heading: "6. Acceptable use",
          body: (
            <p>
              You agree not to abuse the site, attempt to bypass its
              restrictions, scrape it at scale, or use it for any unlawful
              purpose. We may block access at our discretion to protect the
              service.
            </p>
          ),
        },
        {
          heading: "7. Third-party services",
          body: (
            <p>
              Ad networks and analytics providers operate under their own
              terms and privacy policies. Dueneo is not responsible for the
              practices of those third parties.
            </p>
          ),
        },
        {
          heading: "8. Changes to terms",
          body: (
            <p>
              We may update these terms from time to time. Continued use after
              changes constitutes acceptance of the updated terms.
            </p>
          ),
        },
        {
          heading: "9. Contact",
          body: (
            <p>
              Questions about these terms? Email{" "}
              <a href="mailto:hello@dueneo.com" className="text-primary hover:underline">
                hello@dueneo.com
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}

export function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      pathname="/cookie-policy"
      lastUpdated={UPDATED}
      crumbs={[{ label: "Cookie Policy" }]}
      description="What cookies Dueneo uses and how to control them."
      sections={[
        {
          heading: "1. What is a cookie?",
          body: (
            <p>
              A cookie is a small text file stored in your browser. Cookies
              let sites remember things like your theme preference or consent
              choices between visits.
            </p>
          ),
        },
        {
          heading: "2. First-party cookies",
          body: (
            <p>
              Dueneo uses a small number of first-party cookies (or
              localStorage entries) to remember your theme preference
              (light/dark) and any tool-specific preferences you have set.
              These are essential to the site working as you expect.
            </p>
          ),
        },
        {
          heading: "3. Advertising cookies",
          body: (
            <p>
              When ads are enabled, Google AdSense and/or Media.net may set
              cookies for ad personalisation, frequency capping and
              measurement. You can opt out of personalised advertising via
              Google&apos;s Ads Settings page or your browser&apos;s
              &quot;Do Not Track&quot; / &quot;Prevent cross-site tracking&quot;
              setting.
            </p>
          ),
        },
        {
          heading: "4. Analytics cookies",
          body: (
            <p>
              If we use analytics, it is privacy-focused and aggregated. We do
              not use cross-site tracking cookies to follow you around the web.
            </p>
          ),
        },
        {
          heading: "5. Managing cookies",
          body: (
            <p>
              You can clear or block cookies in your browser settings at any
              time. Blocking all cookies may affect some site features
              (preferences won&apos;t be remembered) but tool functionality
              will continue to work.
            </p>
          ),
        },
      ]}
    />
  );
}

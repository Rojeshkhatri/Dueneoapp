/**
 * Google AdSense configuration.
 *
 * After your AdSense account is approved:
 * 1. Replace PUBLISHER_ID with your "ca-pub-XXXXXXXXXX" ID
 * 2. Create ad units in AdSense dashboard and paste the ad slot IDs below
 * 3. Deploy — ads will render automatically
 *
 * While PUBLISHER_ID is empty, placeholder slots are shown instead of ads.
 */

export const ADSENSE = {
  /** Your AdSense publisher ID. Leave empty to show placeholders. */
  publisherId: "ca-pub-4725076822352086",

  /** Ad slot IDs from your AdSense dashboard. Map to placements. */
  slots: {
    /** Banner after the tool/game content */
    "after-tool": "5442944654",
    /** Banner after the how-to/FAQ content */
    "after-content": "1503699640",
    /** Banner after game content */
    "after-game": "5442944654",
    /** Homepage banner */
    homepage: "1503699640",
    /** Category page banner */
    category: "5442944654",
  },
} as const;

"use client";

import * as React from "react";
import type { ToolDefinition } from "@/data/tools";

/**
 * Tool component registry using LAZY imports.
 *
 * Each entry is a `React.lazy` dynamic import. This is critical: with 230+
 * tool components, eagerly importing them all would exhaust memory during
 * Turbopack compilation. Lazy imports ensure only the requested tool's
 * component is compiled and loaded when the user navigates to it.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */

type ToolComp = React.ComponentType<{ tool: ToolDefinition }>;
type LazyToolComp = React.LazyExoticComponent<ToolComp>;

/** Helper: wrap a dynamic import in React.lazy with a named export. */
function lazyNamed(
  factory: () => Promise<Record<string, unknown>>,
  name: string
): LazyToolComp {
  return React.lazy(async () => {
    const mod = await factory();
    return { default: mod[name] as ToolComp };
  });
}

const TOOL_COMPONENTS: Record<string, LazyToolComp> = {
  // ─── Image tools ──────────────────────────────────────────────────────────
  "image-compressor": lazyNamed(() => import("./image/image-compressor"), "ImageCompressor"),
  "image-resizer": lazyNamed(() => import("./image/image-resizer"), "ImageResizer"),
  "crop-image": lazyNamed(() => import("./image/crop-image"), "CropImage"),
  "rotate-image": lazyNamed(() => import("./image/rotate-image"), "RotateImage"),
  "flip-image": lazyNamed(() => import("./image/flip-image"), "FlipImage"),
  "format-converter": lazyNamed(() => import("./image/format-converter"), "FormatConverter"),
  "svg-to-png": lazyNamed(() => import("./image/svg-to-png"), "SvgToPng"),
  "watermark-image": lazyNamed(() => import("./image/watermark-image"), "WatermarkImage"),
  "blur-image": lazyNamed(() => import("./image/blur-image"), "BlurImage"),
  "pixelate-image": lazyNamed(() => import("./image/pixelate-image"), "PixelateImage"),
  "add-border-to-image": lazyNamed(() => import("./image/add-border-to-image"), "AddBorderToImage"),
  "favicon-generator": lazyNamed(() => import("./image/favicon-generator"), "FaviconGenerator"),
  "social-media-image-resizer": lazyNamed(() => import("./image/social-media-image-resizer"), "SocialMediaImageResizer"),
  "heic-to-jpg": lazyNamed(() => import("./image/heic-to-jpg"), "HeicToJpg"),

  // ─── PDF tools ────────────────────────────────────────────────────────────
  "pdf-merge": lazyNamed(() => import("./pdf/pdf-merge"), "PdfMerge"),
  "pdf-split": lazyNamed(() => import("./pdf/pdf-split"), "PdfSplit"),
  "image-to-pdf": lazyNamed(() => import("./pdf/image-to-pdf"), "ImageToPdf"),
  "add-page-numbers-to-pdf": lazyNamed(() => import("./pdf/add-page-numbers-to-pdf"), "AddPageNumbersToPdf"),
  "pdf-metadata-viewer": lazyNamed(() => import("./pdf/pdf-metadata-viewer"), "PdfMetadataViewer"),
  "rotate-pdf": lazyNamed(() => import("./pdf/rotate-pdf"), "RotatePdf"),
  "delete-pdf-pages": lazyNamed(() => import("./pdf/delete-pdf-pages"), "DeletePdfPages"),
  "extract-pdf-pages": lazyNamed(() => import("./pdf/extract-pdf-pages"), "ExtractPdfPages"),
  "rearrange-pdf-pages": lazyNamed(() => import("./pdf/rearrange-pdf-pages"), "RearrangePdfPages"),
  "watermark-pdf": lazyNamed(() => import("./pdf/watermark-pdf"), "WatermarkPdf"),
  "pdf-compress": lazyNamed(() => import("./pdf/pdf-compress"), "PdfCompress"),
  "pdf-to-jpg": lazyNamed(() => import("./pdf/pdf-to-jpg"), "PdfToJpg"),
  "password-protect-pdf": lazyNamed(() => import("./pdf/password-protect-pdf"), "PasswordProtectPdf"),
  "add-text-to-pdf": lazyNamed(() => import("./pdf/add-text-to-pdf"), "AddTextToPdf"),
  "add-image-to-pdf": lazyNamed(() => import("./pdf/add-image-to-pdf"), "AddImageToPdf"),
  "redact-pdf": lazyNamed(() => import("./pdf/redact-pdf"), "RedactPdf"),

  // ─── Developer tools ──────────────────────────────────────────────────────
  "json-formatter": lazyNamed(() => import("./developer/json-formatter"), "JsonFormatter"),
  "json-validator": lazyNamed(() => import("./developer/json-validator"), "JsonValidator"),
  "json-minifier": lazyNamed(() => import("./developer/json-minifier"), "JsonMinifier"),
  "xml-formatter": lazyNamed(() => import("./developer/xml-formatter"), "XmlFormatter"),
  "yaml-formatter": lazyNamed(() => import("./developer/yaml-formatter"), "YamlFormatter"),
  "csv-to-excel": lazyNamed(() => import("./developer/csv-to-excel"), "CsvToExcel"),
  "excel-to-csv": lazyNamed(() => import("./developer/excel-to-csv"), "ExcelToCsv"),
  "csv-to-json": lazyNamed(() => import("./developer/csv-to-json"), "CsvToJson"),
  "json-to-csv": lazyNamed(() => import("./developer/json-to-csv"), "JsonToCsv"),
  "base64-encoder": lazyNamed(() => import("./developer/base64-encoder"), "Base64Encoder"),
  "base64-decoder": lazyNamed(() => import("./developer/base64-decoder"), "Base64Decoder"),
  "url-encoder": lazyNamed(() => import("./developer/url-encoder"), "UrlEncoder"),
  "url-decoder": lazyNamed(() => import("./developer/url-decoder"), "UrlDecoder"),
  "html-escape": lazyNamed(() => import("./developer/html-escape"), "HtmlEscape"),
  "regex-tester": lazyNamed(() => import("./developer/regex-tester"), "RegexTester"),
  "diff-checker": lazyNamed(() => import("./developer/diff-checker"), "DiffChecker"),
  "unix-timestamp-converter": lazyNamed(() => import("./developer/unix-timestamp-converter"), "UnixTimestampConverter"),
  "cron-expression-builder": lazyNamed(() => import("./developer/cron-expression-builder"), "CronExpressionBuilder"),
  "markdown-previewer": lazyNamed(() => import("./developer/markdown-previewer"), "MarkdownPreviewer"),
  "json-to-typescript": lazyNamed(() => import("./developer/json-to-typescript"), "JSONToTypeScript"),
  "sql-formatter": lazyNamed(() => import("./developer/sql-formatter"), "SQLFormatter"),
  "css-minifier": lazyNamed(() => import("./developer/css-minifier"), "CSSMinifier"),
  "js-minifier": lazyNamed(() => import("./developer/js-minifier"), "JSMinifier"),
  "jsonpath-tester": lazyNamed(() => import("./developer/jsonpath-tester"), "JSONPathTester"),
  "http-status-codes": lazyNamed(() => import("./developer/http-status-codes"), "HTTPStatusCodes"),
  "api-response-visualizer": lazyNamed(() => import("./developer/api-response-visualizer"), "ApiResponseVisualizer"),
  "sql-execution-planner": lazyNamed(() => import("./developer/sql-execution-planner"), "SqlExecutionPlanner"),
  "jwt-inspector": lazyNamed(() => import("./developer/jwt-inspector"), "JwtInspector"),
  "graphql-query-explorer": lazyNamed(() => import("./developer/graphql-query-explorer"), "GraphQLQueryExplorer"),
  "openapi-viewer": lazyNamed(() => import("./developer/openapi-viewer"), "OpenApiViewer"),
  "docker-compose-visualizer": lazyNamed(() => import("./developer/docker-compose-visualizer"), "DockerComposeVisualizer"),
  "kubernetes-yaml-validator": lazyNamed(() => import("./developer/kubernetes-yaml-validator"), "KubernetesYamlValidator"),
  "tailwind-class-sorter": lazyNamed(() => import("./developer/tailwind-class-sorter"), "TailwindClassSorter"),
  "css-specificity-calculator": lazyNamed(() => import("./developer/css-specificity-calculator"), "CssSpecificityCalculator"),

  // ─── Security tools ───────────────────────────────────────────────────────
  "password-generator": lazyNamed(() => import("./security/password-generator"), "PasswordGenerator"),
  "password-strength-checker": lazyNamed(() => import("./security/password-strength-checker"), "PasswordStrengthChecker"),
  "jwt-decoder": lazyNamed(() => import("./security/jwt-decoder"), "JwtDecoder"),
  "sha256-generator": lazyNamed(() => import("./security/sha256-generator"), "Sha256Generator"),
  "md5-generator": lazyNamed(() => import("./security/md5-generator"), "Md5Generator"),
  "uuid-generator": lazyNamed(() => import("./security/uuid-generator"), "UuidGenerator"),

  // ─── Utility tools ────────────────────────────────────────────────────────
  "qr-code-generator": lazyNamed(() => import("./utility/qr-code-generator"), "QrCodeGenerator"),
  "unit-converter": lazyNamed(() => import("./utility/unit-converter"), "UnitConverter"),
  "wheel-spinner": lazyNamed(() => import("./utility/wheel-spinner"), "WheelSpinner"),
  "yes-no-wheel": lazyNamed(() => import("./utility/yes-no-wheel"), "YesNoWheel"),
  "name-picker": lazyNamed(() => import("./utility/name-picker"), "NamePicker"),
  "random-number-generator": lazyNamed(() => import("./utility/random-number-generator"), "RandomNumberGenerator"),
  "dice-roller": lazyNamed(() => import("./utility/dice-roller"), "DiceRoller"),
  "coin-flipper": lazyNamed(() => import("./utility/coin-flipper"), "CoinFlipper"),
  "random-letter-generator": lazyNamed(() => import("./utility/random-letter-generator"), "RandomLetterGenerator"),
  "team-generator": lazyNamed(() => import("./utility/team-generator"), "TeamGenerator"),
  "age-calculator": lazyNamed(() => import("./utility/age-calculator"), "AgeCalculator"),
  "bmi-calculator": lazyNamed(() => import("./utility/bmi-calculator"), "BMICalculator"),
  "date-difference-calculator": lazyNamed(() => import("./utility/date-difference-calculator"), "DateDifferenceCalculator"),
  "time-zone-converter": lazyNamed(() => import("./utility/time-zone-converter"), "TimeZoneConverter"),
  "countdown-timer": lazyNamed(() => import("./utility/countdown-timer"), "CountdownTimer"),
  "pomodoro-timer": lazyNamed(() => import("./utility/pomodoro-timer"), "PomodoroTimer"),
  "gpa-calculator": lazyNamed(() => import("./utility/gpa-calculator"), "GPACalculator"),
  "working-days-calculator": lazyNamed(() => import("./utility/working-days-calculator"), "WorkingDaysCalculator"),
  "pregnancy-due-date-calculator": lazyNamed(() => import("./utility/pregnancy-due-date-calculator"), "PregnancyDueDateCalculator"),
  "stopwatch": lazyNamed(() => import("./utility/stopwatch"), "Stopwatch"),
  "world-clock": lazyNamed(() => import("./utility/world-clock"), "WorldClock"),

  // ─── Text tools ───────────────────────────────────────────────────────────
  "word-counter": lazyNamed(() => import("./text/word-counter"), "WordCounter"),
  "character-counter": lazyNamed(() => import("./text/character-counter"), "CharacterCounter"),
  "sentence-counter": lazyNamed(() => import("./text/sentence-counter"), "SentenceCounter"),
  "reading-time-calculator": lazyNamed(() => import("./text/reading-time-calculator"), "ReadingTimeCalculator"),
  "case-converter": lazyNamed(() => import("./text/case-converter"), "CaseConverter"),
  "remove-duplicate-lines": lazyNamed(() => import("./text/remove-duplicate-lines"), "RemoveDuplicateLines"),
  "sort-lines": lazyNamed(() => import("./text/sort-lines"), "SortLines"),
  "reverse-text": lazyNamed(() => import("./text/reverse-text"), "ReverseText"),
  "remove-empty-lines": lazyNamed(() => import("./text/remove-empty-lines"), "RemoveEmptyLines"),
  "remove-extra-spaces": lazyNamed(() => import("./text/remove-extra-spaces"), "RemoveExtraSpaces"),
  "find-and-replace": lazyNamed(() => import("./text/find-and-replace"), "FindAndReplace"),
  "slug-generator": lazyNamed(() => import("./text/slug-generator"), "SlugGenerator"),
  "lorem-ipsum-generator": lazyNamed(() => import("./text/lorem-ipsum-generator"), "LoremIpsumGenerator"),
  "text-cleaner": lazyNamed(() => import("./text/text-cleaner"), "TextCleaner"),
  "fancy-text-generator": lazyNamed(() => import("./text/fancy-text-generator"), "FancyTextGenerator"),
  "strikethrough-text": lazyNamed(() => import("./text/strikethrough-text"), "StrikethroughText"),
  "small-caps-generator": lazyNamed(() => import("./text/small-caps-generator"), "SmallCapsGenerator"),
  "zalgo-text-generator": lazyNamed(() => import("./text/zalgo-text-generator"), "ZalgoTextGenerator"),
  "cursive-text-generator": lazyNamed(() => import("./text/cursive-text-generator"), "CursiveTextGenerator"),
  "binary-translator": lazyNamed(() => import("./text/binary-translator"), "BinaryTranslator"),
  "morse-code-translator": lazyNamed(() => import("./text/morse-code-translator"), "MorseCodeTranslator"),
  "discord-timestamp-generator": lazyNamed(() => import("./text/discord-timestamp-generator"), "DiscordTimestampGenerator"),
  "wordle-solver": lazyNamed(() => import("./text/wordle-solver"), "WordleSolver"),

  // ─── Finance tools ────────────────────────────────────────────────────────
  "gst-calculator": lazyNamed(() => import("./finance/gst-calculator"), "GstCalculator"),
  "vat-calculator": lazyNamed(() => import("./finance/vat-calculator"), "VatCalculator"),
  "sales-tax-calculator": lazyNamed(() => import("./finance/sales-tax-calculator"), "SalesTaxCalculator"),
  "discount-calculator": lazyNamed(() => import("./finance/discount-calculator"), "DiscountCalculator"),
  "profit-margin-calculator": lazyNamed(() => import("./finance/profit-margin-calculator"), "ProfitMarginCalculator"),
  "markup-calculator": lazyNamed(() => import("./finance/markup-calculator"), "MarkupCalculator"),
  "compound-interest-calculator": lazyNamed(() => import("./finance/compound-interest-calculator"), "CompoundInterestCalculator"),
  "loan-calculator": lazyNamed(() => import("./finance/loan-calculator"), "LoanCalculator"),
  "mortgage-calculator": lazyNamed(() => import("./finance/mortgage-calculator"), "MortgageCalculator"),
  "percentage-calculator": lazyNamed(() => import("./finance/percentage-calculator"), "PercentageCalculator"),
  "tip-calculator": lazyNamed(() => import("./finance/tip-calculator"), "TipCalculator"),
  "retirement-calculator": lazyNamed(() => import("./finance/retirement-calculator"), "RetirementCalculator"),
  "inflation-calculator": lazyNamed(() => import("./finance/inflation-calculator"), "InflationCalculator"),
  "fire-calculator": lazyNamed(() => import("./finance/fire-calculator"), "FireCalculator"),
  "freelancer-tax-estimator": lazyNamed(() => import("./finance/freelancer-tax-estimator"), "FreelancerTaxEstimator"),
  "loan-payoff-simulator": lazyNamed(() => import("./finance/loan-payoff-simulator"), "LoanPayoffSimulator"),
  "currency-margin-calculator": lazyNamed(() => import("./finance/currency-margin-calculator"), "CurrencyMarginCalculator"),
  "subscription-cost-tracker": lazyNamed(() => import("./finance/subscription-cost-tracker"), "SubscriptionCostTracker"),
  "invoice-due-date-tracker": lazyNamed(() => import("./finance/invoice-due-date-tracker"), "InvoiceDueDateTracker"),
  "mortgage-comparison": lazyNamed(() => import("./finance/mortgage-comparison"), "MortgageComparison"),

  // ─── Business tools ───────────────────────────────────────────────────────
  "invoice-generator": lazyNamed(() => import("./business/invoice-generator"), "InvoiceGenerator"),
  "quote-generator": lazyNamed(() => import("./business/quote-generator"), "QuoteGenerator"),
  "receipt-generator": lazyNamed(() => import("./business/receipt-generator"), "ReceiptGenerator"),
  "purchase-order-generator": lazyNamed(() => import("./business/purchase-order-generator"), "PurchaseOrderGenerator"),
  "delivery-note-generator": lazyNamed(() => import("./business/delivery-note-generator"), "DeliveryNoteGenerator"),
  "payslip-generator": lazyNamed(() => import("./business/payslip-generator"), "PayslipGenerator"),

  // ─── Design tools ─────────────────────────────────────────────────────────
  "color-picker": lazyNamed(() => import("./design/color-picker"), "ColorPicker"),
  "color-palette-generator": lazyNamed(() => import("./design/color-palette-generator"), "ColorPaletteGenerator"),
  "css-gradient-generator": lazyNamed(() => import("./design/css-gradient-generator"), "CssGradientGenerator"),
  "contrast-checker": lazyNamed(() => import("./design/contrast-checker"), "ContrastChecker"),
  "svg-optimizer": lazyNamed(() => import("./design/svg-optimizer"), "SvgOptimizer"),
  "color-shade-generator": lazyNamed(() => import("./design/color-shade-generator"), "ColorShadeGenerator"),
  "px-rem-converter": lazyNamed(() => import("./design/px-rem-converter"), "PxRemConverter"),
  "color-accessibility-tester": lazyNamed(() => import("./design/color-accessibility-tester"), "ColorAccessibilityTester"),
  "typography-scale-generator": lazyNamed(() => import("./design/typography-scale-generator"), "TypographyScaleGenerator"),
  "icon-optimizer": lazyNamed(() => import("./design/icon-optimizer"), "IconOptimizer"),
  "design-token-generator": lazyNamed(() => import("./design/design-token-generator"), "DesignTokenGenerator"),
  "border-radius-playground": lazyNamed(() => import("./design/border-radius-playground"), "BorderRadiusPlayground"),
  "component-spacing-calculator": lazyNamed(() => import("./design/component-spacing-calculator"), "ComponentSpacingCalculator"),
  "shadow-generator": lazyNamed(() => import("./design/shadow-generator"), "ShadowGenerator"),

  // ─── SEO tools ────────────────────────────────────────────────────────────
  "meta-tag-generator": lazyNamed(() => import("./seo/meta-tag-generator"), "MetaTagGenerator"),
  "open-graph-generator": lazyNamed(() => import("./seo/open-graph-generator"), "OpenGraphGenerator"),
  "robots-txt-generator": lazyNamed(() => import("./seo/robots-txt-generator"), "RobotsTxtGenerator"),
  "sitemap-generator": lazyNamed(() => import("./seo/sitemap-generator"), "SitemapGenerator"),
  "robots-txt-tester": lazyNamed(() => import("./seo/robots-txt-tester"), "RobotsTxtTester"),
  "sitemap-visualizer": lazyNamed(() => import("./seo/sitemap-visualizer"), "SitemapVisualizer"),
  "internal-link-visualizer": lazyNamed(() => import("./seo/internal-link-visualizer"), "InternalLinkVisualizer"),
  "canonical-tag-checker": lazyNamed(() => import("./seo/canonical-tag-checker"), "CanonicalTagChecker"),
  "open-graph-preview": lazyNamed(() => import("./seo/open-graph-preview"), "OpenGraphPreview"),
  "schema-validator": lazyNamed(() => import("./seo/schema-validator"), "SchemaValidator"),
  "serp-snippet-preview": lazyNamed(() => import("./seo/serp-snippet-preview"), "SerpSnippetPreview"),
  "keyword-clustering-tool": lazyNamed(() => import("./seo/keyword-clustering-tool"), "KeywordClusteringTool"),
  "faq-schema-generator": lazyNamed(() => import("./seo/faq-schema-generator"), "FaqSchemaGenerator"),

  // ─── E-commerce tools ─────────────────────────────────────────────────────
  "shopify-profit-calculator": lazyNamed(() => import("./ecommerce/shopify-profit-calculator"), "ShopifyProfitCalculator"),
  "amazon-fba-fee-calculator": lazyNamed(() => import("./ecommerce/amazon-fba-fee-calculator"), "AmazonFbaFeeCalculator"),
  "etsy-fee-calculator": lazyNamed(() => import("./ecommerce/etsy-fee-calculator"), "EtsyFeeCalculator"),
  "tiktok-shop-profit-calculator": lazyNamed(() => import("./ecommerce/tiktok-shop-profit-calculator"), "TikTokShopProfitCalculator"),
  "ebay-fee-calculator": lazyNamed(() => import("./ecommerce/ebay-fee-calculator"), "EbayFeeCalculator"),
  "stripe-fee-calculator": lazyNamed(() => import("./ecommerce/stripe-fee-calculator"), "StripeFeeCalculator"),
  "paypal-fee-calculator": lazyNamed(() => import("./ecommerce/paypal-fee-calculator"), "PaypalFeeCalculator"),
  "product-margin-calculator": lazyNamed(() => import("./ecommerce/product-margin-calculator"), "ProductMarginCalculator"),
  "bundle-pricing-calculator": lazyNamed(() => import("./ecommerce/bundle-pricing-calculator"), "BundlePricingCalculator"),
  "discount-stack-calculator": lazyNamed(() => import("./ecommerce/discount-stack-calculator"), "DiscountStackCalculator"),

  // ─── Social media tools ───────────────────────────────────────────────────
  "instagram-grid-planner": lazyNamed(() => import("./social/instagram-grid-planner"), "InstagramGridPlanner"),
  "youtube-thumbnail-tester": lazyNamed(() => import("./social/youtube-thumbnail-tester"), "YoutubeThumbnailTester"),
  "tiktok-caption-formatter": lazyNamed(() => import("./social/tiktok-caption-formatter"), "TiktokCaptionFormatter"),
  "linkedin-carousel-creator": lazyNamed(() => import("./social/linkedin-carousel-creator"), "LinkedinCarouselCreator"),
  "twitter-thread-formatter": lazyNamed(() => import("./social/twitter-thread-formatter"), "TwitterThreadFormatter"),
  "hashtag-analyzer": lazyNamed(() => import("./social/hashtag-analyzer"), "HashtagAnalyzer"),
  "bio-link-preview": lazyNamed(() => import("./social/bio-link-preview"), "BioLinkPreview"),
  "reel-cover-generator": lazyNamed(() => import("./social/reel-cover-generator"), "ReelCoverGenerator"),
  "post-scheduling-calculator": lazyNamed(() => import("./social/post-scheduling-calculator"), "PostSchedulingCalculator"),

  // ─── Content creator tools ────────────────────────────────────────────────
  "podcast-chapter-generator": lazyNamed(() => import("./content/podcast-chapter-generator"), "PodcastChapterGenerator"),
  "youtube-timestamp-formatter": lazyNamed(() => import("./content/youtube-timestamp-formatter"), "YoutubeTimestampFormatter"),
  "subtitle-timing-editor": lazyNamed(() => import("./content/subtitle-timing-editor"), "SubtitleTimingEditor"),
  "transcript-cleaner": lazyNamed(() => import("./content/transcript-cleaner"), "TranscriptCleaner"),
  "thumbnail-ab-comparer": lazyNamed(() => import("./content/thumbnail-ab-comparer"), "ThumbnailAbComparer"),
  "video-title-scorer": lazyNamed(() => import("./content/video-title-scorer"), "VideoTitleScorer"),
  "hook-analyzer": lazyNamed(() => import("./content/hook-analyzer"), "HookAnalyzer"),
  "script-formatter": lazyNamed(() => import("./content/script-formatter"), "ScriptFormatter"),
  "caption-line-breaker": lazyNamed(() => import("./content/caption-line-breaker"), "CaptionLineBreaker"),

  // ─── HR & recruiting tools ────────────────────────────────────────────────
  "resume-ats-scanner": lazyNamed(() => import("./hr/resume-ats-scanner"), "ResumeAtsScanner"),
  "salary-comparison-calculator": lazyNamed(() => import("./hr/salary-comparison-calculator"), "SalaryComparisonCalculator"),
  "notice-period-calculator": lazyNamed(() => import("./hr/notice-period-calculator"), "NoticePeriodCalculator"),
  "pto-calculator": lazyNamed(() => import("./hr/pto-calculator"), "PtoCalculator"),
  "interview-scorecard-builder": lazyNamed(() => import("./hr/interview-scorecard-builder"), "InterviewScorecardBuilder"),
  "offer-comparison-tool": lazyNamed(() => import("./hr/offer-comparison-tool"), "OfferComparisonTool"),
  "cost-to-company-calculator": lazyNamed(() => import("./hr/cost-to-company-calculator"), "CostToCompanyCalculator"),
  "payslip-analyzer": lazyNamed(() => import("./hr/payslip-analyzer"), "PayslipAnalyzer"),
  "shift-planner": lazyNamed(() => import("./hr/shift-planner"), "ShiftPlanner"),
  "work-anniversary-tracker": lazyNamed(() => import("./hr/work-anniversary-tracker"), "WorkAnniversaryTracker"),

  // ─── Education tools ──────────────────────────────────────────────────────
  "citation-formatter": lazyNamed(() => import("./education/citation-formatter"), "CitationFormatter"),
  "flashcard-generator": lazyNamed(() => import("./education/flashcard-generator"), "FlashcardGenerator"),
  "quiz-randomizer": lazyNamed(() => import("./education/quiz-randomizer"), "QuizRandomizer"),
  "study-planner": lazyNamed(() => import("./education/study-planner"), "StudyPlanner"),
  "assignment-countdown": lazyNamed(() => import("./education/assignment-countdown"), "AssignmentCountdown"),
  "formula-sheet-creator": lazyNamed(() => import("./education/formula-sheet-creator"), "FormulaSheetCreator"),
  "grade-predictor": lazyNamed(() => import("./education/grade-predictor"), "GradePredictor"),
  "attendance-calculator": lazyNamed(() => import("./education/attendance-calculator"), "AttendanceCalculator"),
  "exam-timer": lazyNamed(() => import("./education/exam-timer"), "ExamTimer"),

  // ─── Real estate tools ────────────────────────────────────────────────────
  "rental-yield-calculator": lazyNamed(() => import("./realestate/rental-yield-calculator"), "RentalYieldCalculator"),
  "mortgage-affordability-calculator": lazyNamed(() => import("./realestate/mortgage-affordability-calculator"), "MortgageAffordabilityCalculator"),
  "stamp-duty-calculator": lazyNamed(() => import("./realestate/stamp-duty-calculator"), "StampDutyCalculator"),
  "renovation-budget-planner": lazyNamed(() => import("./realestate/renovation-budget-planner"), "RenovationBudgetPlanner"),
  "property-roi-calculator": lazyNamed(() => import("./realestate/property-roi-calculator"), "PropertyRoiCalculator"),
  "airbnb-income-estimator": lazyNamed(() => import("./realestate/airbnb-income-estimator"), "AirbnbIncomeEstimator"),
  "cap-rate-calculator": lazyNamed(() => import("./realestate/cap-rate-calculator"), "CapRateCalculator"),
  "house-flipping-calculator": lazyNamed(() => import("./realestate/house-flipping-calculator"), "HouseFlippingCalculator"),
  "property-comparison-dashboard": lazyNamed(() => import("./realestate/property-comparison-dashboard"), "PropertyComparisonDashboard"),
  "cash-flow-analyzer": lazyNamed(() => import("./realestate/cash-flow-analyzer"), "CashFlowAnalyzer"),

  // ─── AI / Image tools (viral batch) ───────────────────────────────────────
  "background-remover": lazyNamed(() => import("./image/background-remover"), "BackgroundRemover"),
  "image-color-extractor": lazyNamed(() => import("./image/image-color-extractor"), "ImageColorExtractor"),
  "meme-generator": lazyNamed(() => import("./image/meme-generator"), "MemeGenerator"),
  "passport-photo-maker": lazyNamed(() => import("./image/passport-photo-maker"), "PassportPhotoMaker"),
  "image-to-ascii": lazyNamed(() => import("./image/image-to-ascii"), "ImageToAscii"),
  "photo-collage-maker": lazyNamed(() => import("./image/photo-collage-maker"), "PhotoCollageMaker"),

  // ─── Calculator Suite ─────────────────────────────────────────────────────
  "scientific-calculator": lazyNamed(() => import("./finance/scientific-calculator"), "ScientificCalculator"),
  "graphing-calculator": lazyNamed(() => import("./finance/graphing-calculator"), "GraphingCalculator"),
  "business-calculator": lazyNamed(() => import("./finance/business-calculator"), "BusinessCalculator"),
};

export function ToolRouter({ tool }: { tool: ToolDefinition }) {
  const LazyComponent = tool.component ? TOOL_COMPONENTS[tool.component] : undefined;

  if (!LazyComponent) {
    return (
      <main className="dueneo-container flex-1 py-20 text-center text-sm text-muted-foreground">
        Component <code className="rounded bg-muted px-1.5 py-0.5">{tool.component ?? "(none)"}</code>{" "}
        is not registered yet for <strong>{tool.name}</strong>.
      </main>
    );
  }

  return (
    <React.Suspense
      fallback={
        <main className="dueneo-container flex-1 py-20 text-center text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading {tool.name}…
          </div>
        </main>
      }
    >
      <LazyComponent tool={tool} />
    </React.Suspense>
  );
}

"use client";

import * as React from "react";
import type { ToolDefinition } from "@/data/tools";
import { ImageCompressor } from "@/components/tools/image/image-compressor";
import { ImageResizer } from "@/components/tools/image/image-resizer";
import { CropImage } from "@/components/tools/image/crop-image";
import { RotateImage } from "@/components/tools/image/rotate-image";
import { FlipImage } from "@/components/tools/image/flip-image";
import { FormatConverter } from "@/components/tools/image/format-converter";
import { SvgToPng } from "@/components/tools/image/svg-to-png";
import { WatermarkImage } from "@/components/tools/image/watermark-image";
import { BlurImage } from "@/components/tools/image/blur-image";
import { PixelateImage } from "@/components/tools/image/pixelate-image";
import { AddBorderToImage } from "@/components/tools/image/add-border-to-image";
import { FaviconGenerator } from "@/components/tools/image/favicon-generator";
import { SocialMediaImageResizer } from "@/components/tools/image/social-media-image-resizer";

// Developer tools (Task 2-b)
import { JsonFormatter } from "@/components/tools/developer/json-formatter";
import { JsonValidator } from "@/components/tools/developer/json-validator";
import { JsonMinifier } from "@/components/tools/developer/json-minifier";
import { XmlFormatter } from "@/components/tools/developer/xml-formatter";
import { CsvToJson } from "@/components/tools/developer/csv-to-json";
import { JsonToCsv } from "@/components/tools/developer/json-to-csv";
import { Base64Encoder } from "@/components/tools/developer/base64-encoder";
import { Base64Decoder } from "@/components/tools/developer/base64-decoder";
import { UrlEncoder } from "@/components/tools/developer/url-encoder";
import { UrlDecoder } from "@/components/tools/developer/url-decoder";
import { HtmlEscape } from "@/components/tools/developer/html-escape";
import { RegexTester } from "@/components/tools/developer/regex-tester";
import { DiffChecker } from "@/components/tools/developer/diff-checker";
import { UnixTimestampConverter } from "@/components/tools/developer/unix-timestamp-converter";
import { CronExpressionBuilder } from "@/components/tools/developer/cron-expression-builder";
import { MarkdownPreviewer } from "@/components/tools/developer/markdown-previewer";

// Security tools (Task 2-c)
import { PasswordGenerator } from "@/components/tools/security/password-generator";
import { PasswordStrengthChecker } from "@/components/tools/security/password-strength-checker";
import { JwtDecoder } from "@/components/tools/security/jwt-decoder";
import { Sha256Generator } from "@/components/tools/security/sha256-generator";
import { Md5Generator } from "@/components/tools/security/md5-generator";
import { UuidGenerator } from "@/components/tools/security/uuid-generator";

// Utility tools (Task 2-c)
import { QrCodeGenerator } from "@/components/tools/utility/qr-code-generator";
import { UnitConverter } from "@/components/tools/utility/unit-converter";

// Text tools (Task 2-d)
import { WordCounter } from "@/components/tools/text/word-counter";
import { CharacterCounter } from "@/components/tools/text/character-counter";
import { SentenceCounter } from "@/components/tools/text/sentence-counter";
import { ReadingTimeCalculator } from "@/components/tools/text/reading-time-calculator";
import { CaseConverter } from "@/components/tools/text/case-converter";
import { RemoveDuplicateLines } from "@/components/tools/text/remove-duplicate-lines";
import { SortLines } from "@/components/tools/text/sort-lines";
import { ReverseText } from "@/components/tools/text/reverse-text";
import { RemoveEmptyLines } from "@/components/tools/text/remove-empty-lines";
import { RemoveExtraSpaces } from "@/components/tools/text/remove-extra-spaces";
import { FindAndReplace } from "@/components/tools/text/find-and-replace";
import { SlugGenerator } from "@/components/tools/text/slug-generator";
import { LoremIpsumGenerator } from "@/components/tools/text/lorem-ipsum-generator";
import { TextCleaner } from "@/components/tools/text/text-cleaner";

// Finance tools (Task 2-e)
import { GstCalculator } from "@/components/tools/finance/gst-calculator";
import { VatCalculator } from "@/components/tools/finance/vat-calculator";
import { SalesTaxCalculator } from "@/components/tools/finance/sales-tax-calculator";
import { DiscountCalculator } from "@/components/tools/finance/discount-calculator";
import { ProfitMarginCalculator } from "@/components/tools/finance/profit-margin-calculator";
import { MarkupCalculator } from "@/components/tools/finance/markup-calculator";
import { CompoundInterestCalculator } from "@/components/tools/finance/compound-interest-calculator";
import { LoanCalculator } from "@/components/tools/finance/loan-calculator";
import { MortgageCalculator } from "@/components/tools/finance/mortgage-calculator";
import { PercentageCalculator } from "@/components/tools/finance/percentage-calculator";

// Business tools (Task 2-e)
import { InvoiceGenerator } from "@/components/tools/business/invoice-generator";
import { QuoteGenerator } from "@/components/tools/business/quote-generator";
import { ReceiptGenerator } from "@/components/tools/business/receipt-generator";
import { PurchaseOrderGenerator } from "@/components/tools/business/purchase-order-generator";
import { DeliveryNoteGenerator } from "@/components/tools/business/delivery-note-generator";

// Design tools (Task 2-f)
import { ColorPicker } from "@/components/tools/design/color-picker";
import { ColorPaletteGenerator } from "@/components/tools/design/color-palette-generator";
import { CssGradientGenerator } from "@/components/tools/design/css-gradient-generator";
import { ContrastChecker } from "@/components/tools/design/contrast-checker";
import { SvgOptimizer } from "@/components/tools/design/svg-optimizer";

// SEO tools (Task 2-f)
import { MetaTagGenerator } from "@/components/tools/seo/meta-tag-generator";
import { OpenGraphGenerator } from "@/components/tools/seo/open-graph-generator";
import { RobotsTxtGenerator } from "@/components/tools/seo/robots-txt-generator";
import { SitemapGenerator } from "@/components/tools/seo/sitemap-generator";

// PDF tools (Task 2-g)
import { PdfMerge } from "@/components/tools/pdf/pdf-merge";
import { PdfSplit } from "@/components/tools/pdf/pdf-split";
import { ImageToPdf } from "@/components/tools/pdf/image-to-pdf";
import { AddPageNumbersToPdf } from "@/components/tools/pdf/add-page-numbers-to-pdf";
import { PdfMetadataViewer } from "@/components/tools/pdf/pdf-metadata-viewer";

/**
 * Central registry of implemented tool components, keyed by `tool.component`.
 * Subagents append their imports and entries to this map as they build
 * each tool.
 *
 * Keys MUST match the `component` field defined in `src/data/tools.ts`.
 */
const TOOL_COMPONENTS: Record<string, React.ComponentType<{ tool: ToolDefinition }>> = {
  "image-compressor": ImageCompressor,
  "image-resizer": ImageResizer,
  "crop-image": CropImage,
  "rotate-image": RotateImage,
  "flip-image": FlipImage,
  // Single shared component powers all 7 format-converter tools.
  // Each tool's `slug` (jpg-to-png, png-to-jpg, etc.) drives the target format.
  "format-converter": FormatConverter,
  "svg-to-png": SvgToPng,
  "watermark-image": WatermarkImage,
  "blur-image": BlurImage,
  "pixelate-image": PixelateImage,
  "add-border-to-image": AddBorderToImage,
  "favicon-generator": FaviconGenerator,
  "social-media-image-resizer": SocialMediaImageResizer,

  // Developer tools (Task 2-b)
  "json-formatter": JsonFormatter,
  "json-validator": JsonValidator,
  "json-minifier": JsonMinifier,
  "xml-formatter": XmlFormatter,
  "csv-to-json": CsvToJson,
  "json-to-csv": JsonToCsv,
  "base64-encoder": Base64Encoder,
  "base64-decoder": Base64Decoder,
  "url-encoder": UrlEncoder,
  "url-decoder": UrlDecoder,
  "html-escape": HtmlEscape,
  "regex-tester": RegexTester,
  "diff-checker": DiffChecker,
  "unix-timestamp-converter": UnixTimestampConverter,
  "cron-expression-builder": CronExpressionBuilder,
  "markdown-previewer": MarkdownPreviewer,

  // Security tools (Task 2-c)
  "password-generator": PasswordGenerator,
  "password-strength-checker": PasswordStrengthChecker,
  "jwt-decoder": JwtDecoder,
  "sha256-generator": Sha256Generator,
  "md5-generator": Md5Generator,
  "uuid-generator": UuidGenerator,

  // Utility tools (Task 2-c)
  "qr-code-generator": QrCodeGenerator,
  "unit-converter": UnitConverter,

  // Text tools (Task 2-d)
  "word-counter": WordCounter,
  "character-counter": CharacterCounter,
  "sentence-counter": SentenceCounter,
  "reading-time-calculator": ReadingTimeCalculator,
  "case-converter": CaseConverter,
  "remove-duplicate-lines": RemoveDuplicateLines,
  "sort-lines": SortLines,
  "reverse-text": ReverseText,
  "remove-empty-lines": RemoveEmptyLines,
  "remove-extra-spaces": RemoveExtraSpaces,
  "find-and-replace": FindAndReplace,
  "slug-generator": SlugGenerator,
  "lorem-ipsum-generator": LoremIpsumGenerator,
  "text-cleaner": TextCleaner,

  // Finance tools (Task 2-e)
  "gst-calculator": GstCalculator,
  "vat-calculator": VatCalculator,
  "sales-tax-calculator": SalesTaxCalculator,
  "discount-calculator": DiscountCalculator,
  "profit-margin-calculator": ProfitMarginCalculator,
  "markup-calculator": MarkupCalculator,
  "compound-interest-calculator": CompoundInterestCalculator,
  "loan-calculator": LoanCalculator,
  "mortgage-calculator": MortgageCalculator,
  "percentage-calculator": PercentageCalculator,

  // Business tools (Task 2-e)
  "invoice-generator": InvoiceGenerator,
  "quote-generator": QuoteGenerator,
  "receipt-generator": ReceiptGenerator,
  "purchase-order-generator": PurchaseOrderGenerator,
  "delivery-note-generator": DeliveryNoteGenerator,

  // Design tools (Task 2-f)
  "color-picker": ColorPicker,
  "color-palette-generator": ColorPaletteGenerator,
  "css-gradient-generator": CssGradientGenerator,
  "contrast-checker": ContrastChecker,
  "svg-optimizer": SvgOptimizer,

  // SEO tools (Task 2-f)
  "meta-tag-generator": MetaTagGenerator,
  "open-graph-generator": OpenGraphGenerator,
  "robots-txt-generator": RobotsTxtGenerator,
  "sitemap-generator": SitemapGenerator,

  // PDF tools (Task 2-g)
  "pdf-merge": PdfMerge,
  "pdf-split": PdfSplit,
  // Single shared component powers image-to-pdf, jpg-to-pdf and png-to-pdf.
  // Each tool's `slug` drives the accepted file types and intro text.
  "image-to-pdf": ImageToPdf,
  "add-page-numbers-to-pdf": AddPageNumbersToPdf,
  "pdf-metadata-viewer": PdfMetadataViewer,
};

export function ToolRouter({ tool }: { tool: ToolDefinition }) {
  const Component = tool.component ? TOOL_COMPONENTS[tool.component] : undefined;

  if (!Component) {
    return (
      <main className="dueneo-container flex-1 py-20 text-center text-sm text-muted-foreground">
        Component <code className="rounded bg-muted px-1.5 py-0.5">{tool.component ?? "(none)"}</code>{" "}
        is not registered yet for <strong>{tool.name}</strong>.
      </main>
    );
  }

  return <Component tool={tool} />;
}

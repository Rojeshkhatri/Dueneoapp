import type { LucideIcon } from "lucide-react";
import {
  Image as ImageIcon,
  FileText,
  Code2,
  ShieldCheck,
  Type,
  Briefcase,
  Calculator,
  Palette,
  Search,
  Gamepad2,
  Wrench,
  ShoppingCart,
  Share2,
  PenTool,
  Users,
  GraduationCap,
  Home,
} from "lucide-react";

export type CategorySlug =
  | "image"
  | "pdf"
  | "developer"
  | "security"
  | "text"
  | "business"
  | "finance"
  | "design"
  | "seo"
  | "utility"
  | "games"
  | "ecommerce"
  | "social"
  | "content"
  | "hr"
  | "education"
  | "realestate";

export interface Category {
  slug: CategorySlug;
  name: string;
  /** URL fragment used by the hash router (without leading slash). */
  route: string;
  description: string;
  longDescription: string;
  icon: LucideIcon;
  color: string;
  accent: string;
}

export const categories: Category[] = [
  {
    slug: "image",
    name: "Image Tools",
    route: "image-tools",
    description: "Compress, convert, resize and edit images in your browser.",
    longDescription:
      "Compress, convert, resize, crop, rotate, watermark and transform JPG, PNG, WebP, AVIF and SVG images — all locally in your browser. No uploads, no signup.",
    icon: ImageIcon,
    color: "text-rose-500",
    accent: "bg-rose-500/10",
  },
  {
    slug: "pdf",
    name: "PDF Tools",
    route: "pdf-tools",
    description: "Merge, split, compress and rearrange PDF documents locally.",
    longDescription:
      "Merge, split, compress, rearrange and convert PDF documents entirely in your browser. Your files are processed locally and never uploaded.",
    icon: FileText,
    color: "text-orange-500",
    accent: "bg-orange-500/10",
  },
  {
    slug: "developer",
    name: "Developer Tools",
    route: "developer-tools",
    description: "Format, validate and transform JSON, XML, YAML, CSV and more.",
    longDescription:
      "Format, validate, minify and convert JSON, XML, YAML, CSV, Base64, URLs and other developer payloads. Includes regex tester, diff checker and timestamp converter.",
    icon: Code2,
    color: "text-emerald-500",
    accent: "bg-emerald-500/10",
  },
  {
    slug: "security",
    name: "Security Tools",
    route: "security-tools",
    description: "Generate passwords, decode JWTs and create cryptographic hashes.",
    longDescription:
      "Generate strong passwords, decode JWTs, hash with SHA-256 or MD5, and generate UUIDs. All processing happens locally — your secrets never leave your device.",
    icon: ShieldCheck,
    color: "text-amber-500",
    accent: "bg-amber-500/10",
  },
  {
    slug: "text",
    name: "Text Tools",
    route: "text-tools",
    description: "Count, transform, clean and analyse text in seconds.",
    longDescription:
      "Count words and characters, convert case, remove duplicate lines, sort, reverse, find-and-replace, generate slugs and Lorem Ipsum, and preview Markdown.",
    icon: Type,
    color: "text-sky-500",
    accent: "bg-sky-500/10",
  },
  {
    slug: "business",
    name: "Business Tools",
    route: "business-tools",
    description: "Generate invoices, quotes, receipts and purchase orders.",
    longDescription:
      "Create invoices, quotes, receipts, purchase orders and delivery notes as printable PDFs. Templates render in your browser — no account, no upload.",
    icon: Briefcase,
    color: "text-violet-500",
    accent: "bg-violet-500/10",
  },
  {
    slug: "finance",
    name: "Finance Tools",
    route: "finance-tools",
    description: "Calculate tax, interest, loans and margins quickly.",
    longDescription:
      "GST, VAT, sales tax, discount, profit margin, markup, compound interest, loan and mortgage calculators. Estimates only — verify with a professional.",
    icon: Calculator,
    color: "text-teal-500",
    accent: "bg-teal-500/10",
  },
  {
    slug: "design",
    name: "Design Tools",
    route: "design-tools",
    description: "Pick colours, build palettes, gradients and check contrast.",
    longDescription:
      "Pick colours, generate palettes, craft CSS gradients, check WCAG contrast and optimise SVG markup. Built for designers and front-end developers.",
    icon: Palette,
    color: "text-fuchsia-500",
    accent: "bg-fuchsia-500/10",
  },
  {
    slug: "seo",
    name: "SEO Tools",
    route: "seo-tools",
    description: "Generate meta tags, Open Graph, robots.txt and sitemaps.",
    longDescription:
      "Generate meta tags, Open Graph data, robots.txt rules and XML sitemaps for better search visibility on Google and Bing.",
    icon: Search,
    color: "text-cyan-500",
    accent: "bg-cyan-500/10",
  },
  {
    slug: "utility",
    name: "Utility Tools",
    route: "utility-tools",
    description: "QR codes, unit converters and other handy utilities.",
    longDescription:
      "Generate QR codes, convert units, and other everyday utilities that run instantly in your browser.",
    icon: Wrench,
    color: "text-lime-500",
    accent: "bg-lime-500/10",
  },
  {
    slug: "games",
    name: "Classic Games",
    route: "games",
    description: "Lightweight classic games you can play instantly.",
    longDescription:
      "Play Sudoku, 2048, Minesweeper, Memory Match, Tic-Tac-Toe, Connect Four, Hangman and more. Lightweight, mobile-friendly, no signup, no installs.",
    icon: Gamepad2,
    color: "text-indigo-500",
    accent: "bg-indigo-500/10",
  },
  {
    slug: "ecommerce",
    name: "E-commerce Tools",
    route: "ecommerce-tools",
    description: "Calculate fees and profits for Shopify, Amazon, Etsy, eBay and more.",
    longDescription:
      "Calculate marketplace fees, payment processor fees, profit margins, bundle pricing and discount stacks for Shopify, Amazon FBA, Etsy, TikTok Shop, eBay, Stripe and PayPal.",
    icon: ShoppingCart,
    color: "text-emerald-500",
    accent: "bg-emerald-500/10",
  },
  {
    slug: "social",
    name: "Social Media Tools",
    route: "social-tools",
    description: "Plan Instagram grids, format captions and build carousels.",
    longDescription:
      "Plan Instagram grids, test YouTube thumbnails, format TikTok captions, build LinkedIn carousels, format Twitter threads, analyze hashtags and generate reel covers.",
    icon: Share2,
    color: "text-pink-500",
    accent: "bg-pink-500/10",
  },
  {
    slug: "content",
    name: "Content Creator Tools",
    route: "content-tools",
    description: "Chapters, timestamps, subtitles, transcripts and script tools.",
    longDescription:
      "Generate podcast chapters, format YouTube timestamps, edit subtitles, clean transcripts, compare thumbnails, score video titles, analyze hooks and format scripts.",
    icon: PenTool,
    color: "text-orange-500",
    accent: "bg-orange-500/10",
  },
  {
    slug: "hr",
    name: "HR & Recruiting Tools",
    route: "hr-tools",
    description: "ATS resume scanner, salary comparison, PTO and offer tools.",
    longDescription:
      "Scan resumes for ATS compatibility, compare salaries, calculate notice periods and PTO, build interview scorecards, compare offers, calculate cost-to-company and plan shifts.",
    icon: Users,
    color: "text-violet-500",
    accent: "bg-violet-500/10",
  },
  {
    slug: "education",
    name: "Education Tools",
    route: "education-tools",
    description: "Citations, flashcards, quizzes, study planners and grade tools.",
    longDescription:
      "Format citations, generate flashcards, randomize quizzes, plan study schedules, count down to assignments, create formula sheets, predict grades, calculate attendance and time exams.",
    icon: GraduationCap,
    color: "text-blue-500",
    accent: "bg-blue-500/10",
  },
  {
    slug: "realestate",
    name: "Real Estate Tools",
    route: "realestate-tools",
    description: "Rental yield, mortgage affordability, stamp duty and ROI.",
    longDescription:
      "Calculate rental yield, mortgage affordability, stamp duty, renovation budgets, property ROI, Airbnb income, cap rates, house flipping costs and compare properties side by side.",
    icon: Home,
    color: "text-amber-500",
    accent: "bg-amber-500/10",
  },
];

export function getCategory(slug: CategorySlug): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getCategoryByRoute(route: string): Category | undefined {
  return categories.find((c) => c.route === route);
}

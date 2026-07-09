import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: false,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: "Dueneo — Free Browser Tools & Classic Games",
    template: "%s | Dueneo",
  },
  description:
    "Fast, private browser-based tools for images, PDFs, developers, text, business, finance, design, and SEO — plus lightweight classic games you can play instantly. No upload, no signup.",
  keywords: [
    "online tools",
    "browser tools",
    "image compressor",
    "pdf tools",
    "json formatter",
    "password generator",
    "free games",
    "sudoku",
    "2048",
    "dueneo",
  ],
  authors: [{ name: "Dueneo" }],
  metadataBase: new URL("https://dueneo.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Dueneo — Free Browser Tools & Classic Games",
    description:
      "Fast, private browser-based tools for images, PDFs, developers, text, business, finance, design, and SEO — plus lightweight classic games.",
    url: "https://dueneo.com",
    siteName: "Dueneo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dueneo — Free Browser Tools & Classic Games",
    description:
      "Fast, private browser-based tools plus lightweight classic games.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

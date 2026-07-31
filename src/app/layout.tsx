import type { Metadata } from "next";
import { Inter, Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

// Body / UI text — Inter (neo-grotesque, high legibility, great at small sizes)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Display / headings — Space Grotesk (premium geometric, high character)
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Monospace — Geist Mono (data, code, metrics)
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MarketMind AI — AI-Driven Marketing Agency",
  description:
    "MarketMind AI is an AI-driven marketing agency SaaS. Analyze any website, run SEO-based cold email campaigns, generate SEO reports, copywriting, and content strategy — powered by an autonomous multi-agent system.",
  keywords: [
    "AI marketing",
    "marketing agency",
    "SEO",
    "cold email",
    "copywriting",
    "content strategy",
    "MarketMind AI",
  ],
  authors: [{ name: "MarketMind AI" }],
  icons: {
    icon: "/brand-logo-tiny.png",
  },
  openGraph: {
    title: "MarketMind AI — AI-Driven Marketing Agency",
    description:
      "Analyze websites, run cold email campaigns, generate SEO reports, copywriting and content strategy with an autonomous AI agent system.",
    siteName: "MarketMind AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="antialiased bg-background text-foreground"
        suppressHydrationWarning
      >
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "FORMA — 3D Commercial Space Planner",
  description:
    "Plan cafés, small offices and boutique retail in 3D. Templates, live capacity & fire-egress checks, brand-color theming and cost estimates.",
  keywords: ["floor plan", "3D planner", "café design", "office layout", "retail fixtures", "capacity planner"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "FORMA — 3D Commercial Space Planner",
    description:
      "Lay out your café, studio or boutique in 3D. Seats, fire egress and a fit-out budget update as you go — export a print-ready sheet in one click.",
    siteName: "FORMA",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/gallery/cafe.png",
        width: 1024,
        height: 1024,
        alt: "FORMA planner — documentary-style café interior used as a starting template",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FORMA — 3D Commercial Space Planner",
    description:
      "Drag counters, click in chairs, swing between plan and 3D. Capacity, egress and costs update live.",
    images: ["/gallery/cafe.png"],
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
        className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

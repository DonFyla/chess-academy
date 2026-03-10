import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Providers from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { defaultMetadata } from "@/lib/metadata";
import "@/lib/debug"; // Debug utilities - remove in production
import Breadcrumb from "@/components/Breadcrumb";

const inter = Inter({ subsets: ["latin"] });

export const metadata = defaultMetadata;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#5E5044" />
        <link rel="canonical" href="https://www.themovingtrain.org" />
      </head>
      <body className={inter.className}>
        <Providers>
          <Breadcrumb />
          {children}
          <Toaster position="top-center" />
        </Providers>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
      </body>
    </html>
  );
}

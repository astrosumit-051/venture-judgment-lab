import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const description = "A private, evidence-preserving apprenticeship for early-stage technology investing judgment.";

  return {
    metadataBase: new URL(origin),
    title: "Venture Judgment Lab",
    description,
    openGraph: {
      title: "Venture Judgment Lab",
      description,
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Venture Judgment Lab — Evidence before narrative." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Venture Judgment Lab",
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

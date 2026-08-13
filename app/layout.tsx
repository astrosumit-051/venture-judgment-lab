import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const description = "Evidence before narrative. A private conversational apprenticeship for early-stage technology investing judgment—talk it through, review the evidence, then preserve it.";

  return {
    metadataBase: new URL(origin),
    title: "Venture Judgment Lab",
    description,
    openGraph: {
      title: "Venture Judgment Lab",
      description,
      type: "website",
      images: [{ url: `${origin}/og-conversational-teacher.png`, width: 1200, height: 630, alt: "Venture Judgment Lab — Talk it through. Preserve the judgment." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Venture Judgment Lab",
      description,
      images: [`${origin}/og-conversational-teacher.png`],
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

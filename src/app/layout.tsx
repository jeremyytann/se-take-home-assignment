import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Order Controller",
  description: "A Next.js prototype for the restaurant order controller."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <Link className="brand" href="/">
              Order Controller
            </Link>
            <nav className="nav" aria-label="Main navigation">
              <Link href="/">Home</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

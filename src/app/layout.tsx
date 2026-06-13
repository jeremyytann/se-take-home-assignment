import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "McDonald's Order Controller",
  description: "A McDonald's automated order controller prototype."
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
              <span className="brand-mark">M</span>
              <span>McDonald's</span>
            </Link>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

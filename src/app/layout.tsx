import type { Metadata } from "next";
import { Layers3 } from "lucide-react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Grindly", template: "%s | Grindly" }, description: "Grindly specialist exchange", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/join"><Layers3 aria-hidden="true" size={28} /><span>Grindly</span></Link>
        <Navigation />
        <div className="network"><span className="status-dot" />Robinhood Chain testnet<span className="network-id">46630</span></div>
      </aside>
      <div className="main-column"><div className="topbar"><span>Private research exchange</span><span className="testnet-label">Testnet</span></div>
        <main id="main" tabIndex={-1}>{children}</main>
        <footer>Testnet assets have no monetary value.</footer>
      </div>
    </div>
  </body></html>;
}

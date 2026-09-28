import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Grindly", template: "%s | Grindly" },
  description: "Grindly specialist exchange",
  robots: { index: false, follow: false },
};
export const runtime = "nodejs";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="app-shell">
          <aside className="sidebar">
            <Link className="brand" href="/join">
              <Image
                src="/brand/grindly/grindly-logo.svg"
                alt=""
                width={32}
                height={32}
              />
              <span>Grindly</span>
            </Link>
            <Navigation />
            <div
              className="network"
              aria-label="Grindly on Robinhood Chain testnet"
            >
              <Link href="/join" title="Grindly">
                <Image
                  src="/brand/grindly/grindly-logo.svg"
                  alt="Grindly"
                  width={28}
                  height={28}
                />
              </Link>
              <a
                href="https://docs.robinhood.com/chain/"
                title="Robinhood Chain testnet"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src="/brand/robinhood-chain-white.svg"
                  alt="Robinhood Chain"
                  width={153}
                  height={20}
                />
              </a>
            </div>
          </aside>
          <div className="main-column">
            <div className="topbar">
              <Link
                className="profile-shortcut"
                href="/membership"
                aria-label="My profile"
                title="My profile"
              >
                <CircleUserRound size={28} aria-hidden="true" />
              </Link>
            </div>
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <footer>Testnet assets have no monetary value.</footer>
          </div>
        </div>
      </body>
    </html>
  );
}

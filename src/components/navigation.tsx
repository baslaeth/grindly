"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowRightToLine,
  Share2,
  LayoutDashboard,
  ListChecks,
  Menu,
  X,
  House,
  ScanSearch,
  Bell,
} from "lucide-react";
import { clearChatDrafts } from "@/chat/drafts";

const icons = {
  join: ArrowRightToLine,
  workbench: LayoutDashboard,
  submit: Share2,
  review: ListChecks,
};

export function Navigation({
  signedIn = false,
}: {
  signedIn?: boolean;
  reviewer?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const logout = (event: StorageEvent) => {
      if (event.key === "grindly:logout")
        window.dispatchEvent(new Event("grindly:logout"));
    };
    window.addEventListener("storage", logout);
    return () => window.removeEventListener("storage", logout);
  }, []);
  const items = [
    { href: "/", title: "Home", icon: House },
    { href: "/workbench", title: "Hub", icon: icons.workbench },
    { href: "/findings/new", title: "Submit alpha", icon: icons.submit },
    { href: "/intelligence", title: "Grind Intelligence", icon: ScanSearch },
    ...(signedIn
      ? [{ href: "/review", title: "Review Desk", icon: icons.review }]
      : []),
    ...(signedIn
      ? [{ href: "/following", title: "Following", icon: Bell }]
      : []),
    ...(!signedIn
      ? [{ href: "/join", title: "Sign in", icon: icons.join }]
      : []),
  ];
  return (
    <div className="navigation-shell">
      <button
        className="button secondary icon-button nav-toggle"
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        title={open ? "Close navigation" : "Open navigation"}
        aria-controls="main-navigation"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <nav id="main-navigation" aria-label="Main navigation" data-open={open}>
        {items.map((screen) => {
          const Icon = screen.icon;
          return (
            <Link
              key={screen.href}
              href={screen.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === screen.href ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{screen.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="nav-signout"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/auth/signout", {
              method: "POST",
            });
            if (response.ok) {
              clearChatDrafts();
              router.push("/");
              router.refresh();
            } else setError("Could not sign out. Please retry.");
          } catch {
            setError("Connection unavailable. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out..." : "Sign out"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

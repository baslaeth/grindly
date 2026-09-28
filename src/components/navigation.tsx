"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowRightToLine,
  Send,
  LayoutDashboard,
  ListChecks,
  Menu,
  X,
  House,
} from "lucide-react";
import { clearChatDrafts } from "@/chat/drafts";

const icons = {
  join: ArrowRightToLine,
  workbench: LayoutDashboard,
  submit: Send,
  review: ListChecks,
};

export function Navigation({
  signedIn = false,
  reviewer = false,
}: {
  signedIn?: boolean;
  reviewer?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
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
    ...(reviewer
      ? [{ href: "/review", title: "Review Desk", icon: icons.review }]
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
      {signedIn && (
        <button
          type="button"
          className="nav-signout"
          onClick={async () => {
            const response = await fetch("/api/auth/signout", {
              method: "POST",
            });
            if (response.ok) {
              clearChatDrafts();
              router.push("/");
              router.refresh();
            }
          }}
        >
          Sign out
        </button>
      )}
    </div>
  );
}

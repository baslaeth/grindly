"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowRightToLine,
  BookOpen,
  FilePenLine,
  Fingerprint,
  LayoutDashboard,
  ListChecks,
  Menu,
  X,
} from "lucide-react";
import { screens } from "@/config/screens";

const icons = {
  join: ArrowRightToLine,
  workbench: LayoutDashboard,
  submit: FilePenLine,
  review: ListChecks,
  contribution: BookOpen,
  membership: Fingerprint,
};

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
        {screens.map((screen) => {
          const Icon = icons[screen.icon];
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

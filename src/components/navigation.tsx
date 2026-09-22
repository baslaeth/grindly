"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightToLine, BookOpen, FilePenLine, Fingerprint, LayoutDashboard, ListChecks } from "lucide-react";
import { screens } from "@/config/screens";

const icons = { join: ArrowRightToLine, workbench: LayoutDashboard, submit: FilePenLine, review: ListChecks, contribution: BookOpen, membership: Fingerprint };

export function Navigation() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation">{screens.map((screen) => {
    const Icon = icons[screen.icon];
    return <Link key={screen.href} href={screen.href} aria-current={pathname === screen.href ? "page" : undefined}>
      <Icon size={18} aria-hidden="true" /><span>{screen.title}</span>
    </Link>;
  })}</nav>;
}

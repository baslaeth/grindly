import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";

export function Screen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Specialist exchange</p>
        <h1>{title}</h1>
      </header>
      {children}
    </>
  );
}

export function MembershipRequired() {
  return (
    <section className="empty-state" aria-label="Membership required">
      <LockKeyhole size={28} aria-hidden="true" />
      <h2>Active membership required</h2>
      <Link className="button" href="/join">
        Go to Join
      </Link>
    </section>
  );
}

"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function useUnread() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, number>>).detail;
      setCounts((previous) => ({ ...previous, ...detail }));
    };
    window.addEventListener("grindly:unread", update);
    return () => window.removeEventListener("grindly:unread", update);
  }, []);
  return counts;
}
export function RoomUnread({ room }: { room: string }) {
  const count = useUnread()[room] ?? 0;
  return count > 0 ? (
    <span className="room-unread" aria-label={`${count} unread messages`}>
      {count}
    </span>
  ) : null;
}

export function RoomSelector({
  rooms,
  selected,
}: {
  rooms: { id: string; category: string }[];
  selected: string;
}) {
  const router = useRouter();
  const unread = useUnread();
  return (
    <label className="mobile-room-select">
      Room
      <select
        aria-label="Room"
        value=""
        onChange={(event) => {
          // Re-selecting the current room also restores its alpha feed.
          if (event.target.value === selected) window.location.hash = "#alphas";
          router.push(
            `/workbench?room=${encodeURIComponent(event.target.value)}#alphas`,
          );
        }}
      >
        <option value="" disabled>
          {rooms.find((r) => r.id === selected)?.category ?? "Choose room"}
        </option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.category}
            {unread[r.id] ? ` (${unread[r.id]} unread)` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProfileDrawer({
  back,
  children,
}: {
  back: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="profile-drawer"
      aria-labelledby="profile-title"
      onCancel={(event) => {
        event.preventDefault();
        router.replace(back, { scroll: false });
      }}
    >
      <button
        type="button"
        className="button secondary profile-close"
        aria-label="Back to chat"
        title="Back to chat"
        onClick={() => router.replace(back, { scroll: false })}
      >
        <ArrowLeft size={18} /> Back to chat
      </button>
      {children}
    </dialog>
  );
}

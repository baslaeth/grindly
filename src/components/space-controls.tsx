"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function RoomSelector({
  rooms,
  selected,
}: {
  rooms: { id: string; category: string }[];
  selected: string;
}) {
  const router = useRouter();
  return (
    <label className="mobile-room-select">
      Room
      <select
        aria-label="Room"
        value=""
        onChange={(event) => {
          // Next preserves this component for the current room; native hash
          // navigation also restores Chat when returning from another panel.
          if (event.target.value === selected)
            window.location.hash = "#discussion";
          router.push(
            `/workbench?room=${encodeURIComponent(event.target.value)}#discussion`,
          );
        }}
      >
        <option value="" disabled>
          {rooms.find((r) => r.id === selected)?.category ?? "Choose room"}
        </option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.category}
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

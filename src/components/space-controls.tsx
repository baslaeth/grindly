"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

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
        value={selected}
        onChange={(event) =>
          router.push(
            `/workbench?room=${encodeURIComponent(event.target.value)}`,
          )
        }
      >
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
        className="button secondary icon-button profile-close"
        aria-label="Close profile"
        title="Close profile"
        onClick={() => router.replace(back, { scroll: false })}
      >
        <X size={18} />
      </button>
      {children}
    </dialog>
  );
}

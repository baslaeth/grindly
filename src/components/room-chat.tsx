"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Paperclip,
  X,
  Reply,
  Smile,
  ArrowDown,
  Pencil,
  Trash2,
  FilePlus2,
  RefreshCw,
} from "lucide-react";
import {
  draftKey,
  mergeMessages,
  reactionLabels,
  shouldSend,
  type ChatSnapshot,
  type ChatMutation,
  type ChatMessage,
} from "@/chat/model";
import { specialtyLabel } from "@/research/model";
import { readDraftFiles, writeDraftFiles } from "@/chat/drafts";

type Attachment = {
  id: string;
  type: string;
  preview?: string;
  file?: File;
  progress: number;
  uploaded: boolean;
};
type Pending = { request: string; mutation: ChatMutation };
type Draft = {
  text: string;
  reply: string | null;
  media: { id: string; type: string }[];
  pending?: Pending;
};
const emptySnapshot: ChatSnapshot = {
  messages: [],
  hasOlder: false,
  readSequence: 0,
  unread: {},
};
const reactionSymbols = {
  like: "\uD83D\uDC4D",
  thanks: "\uD83D\uDE4F",
  insight: "\uD83D\uDCA1",
  question: "\u2753",
};
const emojis = [
  "\uD83D\uDC4D",
  "\uD83D\uDE4F",
  "\uD83D\uDCA1",
  "\uD83D\uDE42",
  "\uD83D\uDD0D",
];
async function post(room: string, pending: Pending) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room,
      request: pending.request,
      mutation: pending.mutation,
    }),
  });
  if (!response.ok)
    throw new Error(
      "Message action failed. Your draft is retained. Retry when connected.",
    );
  return response.json();
}
function upload(
  room: string,
  item: Attachment,
  onProgress: (n: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/chat/media");
    xhr.setRequestHeader("Content-Type", item.type);
    xhr.setRequestHeader("X-Room", room);
    xhr.setRequestHeader("X-Upload-ID", item.id);
    xhr.timeout = 45000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Image upload failed. Check the file and retry."));
    xhr.onerror = xhr.ontimeout = () =>
      reject(new Error("Upload interrupted. Retry when connected."));
    xhr.send(item.file);
  });
}
function LinkedText({ text }: { text: string }) {
  return text.split(/(https?:\/\/[^\s<>]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer noopener">
        {part}
      </a>
    ) : (
      part
    ),
  );
}
export function RoomChat({
  room,
  memberId,
  rank,
  category,
  canPost,
}: {
  room: string;
  memberId: string;
  rank: string;
  category: string;
  canPost: boolean;
}) {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [media, setMedia] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const [denied, setDenied] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [edit, setEdit] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactionFor, setReactionFor] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [pending, setPending] = useState<Pending | undefined>();
  const viewport = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const current = useRef(snapshot);
  const atBottom = useRef(true);
  const reading = useRef(false);
  const loggedOut = useRef(false);
  const sending = useRef(false);
  const initialized = useRef(false);
  const readSequence = useRef(0);
  const urls = useRef(new Set<string>());
  const fileSignature = useRef("");
  const key = draftKey(memberId, room);
  const lastReadRequest = useRef<Pending | undefined>(undefined);
  const scrollLatest = useCallback(() => {
    const el = viewport.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottom.current = true;
    setNewCount(0);
    setShowJump(false);
  }, []);
  const markRead = useCallback(
    async (sequence: number) => {
      if (
        !sequence ||
        sequence <= readSequence.current ||
        document.visibilityState !== "visible"
      )
        return;
      const p =
        lastReadRequest.current?.mutation.action === "read" &&
        lastReadRequest.current.mutation.sequence === sequence
          ? lastReadRequest.current
          : {
              request: crypto.randomUUID(),
              mutation: { action: "read" as const, sequence },
            };
      lastReadRequest.current = p;
      try {
        await post(room, p);
        readSequence.current = Math.max(sequence, readSequence.current);
        lastReadRequest.current = undefined;
        window.dispatchEvent(
          new CustomEvent("grindly:unread", {
            detail: { ...current.current.unread, [room]: 0 },
          }),
        );
      } catch {
        /* Retry on the next visible update. */
      }
    },
    [room],
  );
  const refresh = useCallback(
    async (older = false) => {
      if (reading.current || loggedOut.current) return;
      reading.current = true;
      const el = viewport.current;
      const height = el?.scrollHeight ?? 0;
      const top = el?.scrollTop ?? 0;
      try {
        const items = current.current.messages;
        const q = new URLSearchParams({ room });
        if (older && items.length) q.set("before", String(items[0]!.sequence));
        else if (items.length) q.set("after", String(items[0]!.sequence));
        const response = await fetch(`/api/chat?${q}`, { cache: "no-store" });
        if (!response.ok) {
          if ([401, 403].includes(response.status)) {
            setDenied(true);
            setSnapshot(emptySnapshot);
            current.current = emptySnapshot;
          }
          throw new Error(
            "Conversation unavailable. Access must be verified before new content can load.",
          );
        }
        const next = (await response.json()) as ChatSnapshot;
        if (loggedOut.current) return;
        const added = next.messages.filter(
          (m) => !items.some((old) => old.id === m.id),
        ).length;
        const merged = {
          ...next,
          messages: mergeMessages(items, next.messages),
          hasOlder:
            older || !items.length ? next.hasOlder : current.current.hasOlder,
        };
        current.current = merged;
        setSnapshot(merged);
        setLoaded(true);
        setDisconnected(false);
        setDenied(false);
        readSequence.current = Math.max(
          readSequence.current,
          next.readSequence,
        );
        window.dispatchEvent(
          new CustomEvent("grindly:unread", { detail: next.unread }),
        );
        requestAnimationFrame(() => {
          if (older && el) el.scrollTop = top + (el.scrollHeight - height);
          else if (atBottom.current || !initialized.current) {
            scrollLatest();
            void markRead(merged.messages.at(-1)?.sequence ?? 0);
          } else if (added) setNewCount((n) => n + added);
          initialized.current = true;
        });
      } catch {
        setDisconnected(true);
        setLoaded(true);
      } finally {
        reading.current = false;
      }
    },
    [room, markRead, scrollLatest],
  );
  useEffect(() => {
    let disposed = false;
    const restore = setTimeout(async () => {
      let raw: Draft | undefined;
      try {
        raw = JSON.parse(localStorage.getItem(key) ?? "null") ?? undefined;
      } catch {}
      const files = await readDraftFiles(key);
      if (disposed || loggedOut.current) return;
      const uploaded = Array.isArray(raw?.media)
        ? raw.media.filter(
            (m) => typeof m.id === "string" && typeof m.type === "string",
          )
        : [];
      const restored: Attachment[] = files
        .filter(
          (f) => f.file instanceof Blob && !uploaded.some((m) => m.id === f.id),
        )
        .map((f) => {
          const preview = URL.createObjectURL(f.file);
          urls.current.add(preview);
          return { ...f, preview, progress: 0, uploaded: false };
        });
      setMedia([
        ...uploaded.map((m) => ({ ...m, uploaded: true, progress: 100 })),
        ...restored,
      ]);
      if (raw) {
        setText(typeof raw.text === "string" ? raw.text : "");
        setReply(raw.reply ?? null);
        setPending(raw.pending);
      }
      setDraftReady(true);
      void refresh();
    }, 0);
    const timer = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !viewport.current?.closest("[hidden]")
      )
        void refresh();
    }, 8000);
    const reconnect = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const clear = () => {
      loggedOut.current = true;
      setText("");
      setMedia([]);
      setReply(null);
      setPending(undefined);
      setDenied(true);
      setSnapshot(emptySnapshot);
      current.current = emptySnapshot;
    };
    const crossTabLogout = (event: StorageEvent) => {
      if (event.key === "grindly:logout") clear();
    };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", reconnect);
    window.addEventListener("grindly:logout", clear);
    window.addEventListener("storage", crossTabLogout);
    const objectUrls = urls.current;
    return () => {
      disposed = true;
      clearTimeout(restore);
      clearInterval(timer);
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", reconnect);
      window.removeEventListener("grindly:logout", clear);
      window.removeEventListener("storage", crossTabLogout);
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [key, refresh]);
  useEffect(() => {
    if (!draftReady || denied) return;
    const files = media.filter(
      (m): m is Attachment & { file: File } => !!m.file && !m.uploaded,
    );
    const signature = files.map((m) => m.id).join(",");
    if (fileSignature.current !== signature) {
      fileSignature.current = signature;
      void writeDraftFiles(
        key,
        files.map(({ id, type, file }) => ({ id, type, file })),
      );
    }
  }, [key, media, draftReady, denied]);
  useEffect(() => {
    if (!draftReady || denied) return;
    const draft: Draft = {
      text,
      reply,
      media: media
        .filter((m) => m.uploaded)
        .map((m) => ({ id: m.id, type: m.type })),
      pending,
    };
    try {
      if (text || reply || media.length || pending)
        localStorage.setItem(key, JSON.stringify(draft));
      else localStorage.removeItem(key);
    } catch {}
  }, [key, text, reply, media, pending, draftReady, denied]);
  function addFiles(files: File[]) {
    if (busy || pending) return;
    const images = files.filter(
      (f) =>
        ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(
          f.type,
        ) &&
        f.size > 0 &&
        f.size <= 2 * 1024 * 1024,
    );
    if (images.length !== files.length || images.length + media.length > 4) {
      setError(
        "Choose up to four PNG, JPEG, WebP or GIF files, each at most 2 MB.",
      );
      return;
    }
    setMedia((old) => [
      ...old,
      ...images.map((file) => {
        const preview = URL.createObjectURL(file);
        urls.current.add(preview);
        return {
          id: crypto.randomUUID(),
          type: file.type,
          file,
          preview,
          progress: 0,
          uploaded: false,
        };
      }),
    ]);
  }
  async function send() {
    if (
      busy ||
      sending.current ||
      denied ||
      !canPost ||
      (!pending && !text.trim() && !media.length)
    )
      return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      let p = pending;
      if (!p) {
        for (const item of media)
          if (!item.uploaded) {
            await upload(room, item, (n) =>
              setMedia((old) =>
                old.map((m) => (m.id === item.id ? { ...m, progress: n } : m)),
              ),
            );
            setMedia((old) =>
              old.map((m) =>
                m.id === item.id ? { ...m, uploaded: true, progress: 100 } : m,
              ),
            );
          }
        p = {
          request: crypto.randomUUID(),
          mutation: {
            action: "send",
            body: text,
            reply,
            attachments: media.map((m) => m.id),
          },
        };
        setPending(p);
        try {
          localStorage.setItem(
            key,
            JSON.stringify({
              text,
              reply,
              media: media.map((m) => ({ id: m.id, type: m.type })),
              pending: p,
            }),
          );
        } catch {
          /* In-memory retries remain available when storage is disabled. */
        }
      }
      await post(room, p);
      setPending(undefined);
      setText("");
      setReply(null);
      setMedia([]);
      try {
        localStorage.removeItem(key);
      } catch {}
      atBottom.current = true;
      await refresh();
      input.current?.focus();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Send failed. Retry when connected.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function act(mutation: ChatMutation) {
    setError("");
    try {
      await post(room, { request: crypto.randomUUID(), mutation });
      setEdit(null);
      setReactionFor(null);
      await refresh();
    } catch {
      setError("Action not saved. Reload the conversation and try again.");
    }
  }
  return (
    <section
      className="room-chat"
      id="discussion"
      aria-label="Room conversation"
    >
      <div className="section-heading">
        <h2>
          {rank} / {category} chat
        </h2>
        <button
          type="button"
          className="button secondary icon-button"
          aria-label="Refresh conversation"
          title="Refresh conversation"
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {disconnected && (
        <p role="status" className="notice">
          {denied
            ? "Membership or room access is unavailable."
            : "Connection interrupted. Retrying when connected; your draft is retained."}
        </p>
      )}
      <div
        className="conversation"
        ref={viewport}
        tabIndex={0}
        aria-label="Message history"
        onScroll={() => {
          const el = viewport.current!;
          atBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          setShowJump(!atBottom.current);
          if (atBottom.current) {
            setNewCount(0);
            void markRead(current.current.messages.at(-1)?.sequence ?? 0);
          }
        }}
      >
        {snapshot.hasOlder && (
          <button
            className="button secondary"
            onClick={() => void refresh(true)}
          >
            Load older messages
          </button>
        )}
        {!loaded ? (
          <p role="status">Loading conversation...</p>
        ) : (
          !snapshot.messages.length &&
          !denied && (
            <p className="chat-empty">
              No messages yet in this room. Start the conversation.
            </p>
          )
        )}
        {snapshot.messages.map((m) => (
          <article className="chat-message" key={m.id} id={`message-${m.id}`}>
            <Link
              className="profile-avatar"
              href={`/workbench?room=${room}&profile=${m.author}`}
              aria-label={`Open ${m.name}'s profile`}
            >
              {m.name
                .split(/\s+/)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")}
            </Link>
            <div className="chat-message-content">
              <header className="chat-byline">
                <Link href={`/workbench?room=${room}&profile=${m.author}`}>
                  <strong>{m.name}</strong>
                </Link>
                <span className="specialty">{specialtyLabel(m.specialty)}</span>
                <time dateTime={m.createdAt}>
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {m.edited && <span className="muted">Edited</span>}
                {m.isDemo && (
                  <span className="sample-label">Isolated sample</span>
                )}
              </header>
              {m.reply && (
                <a className="reply-reference" href={`#message-${m.reply}`}>
                  Reply to{" "}
                  {snapshot.messages.find((parent) => parent.id === m.reply)
                    ?.name ?? "earlier message"}
                </a>
              )}
              {m.deleted ? (
                <p className="muted">Message deleted</p>
              ) : (
                <>
                  <p className="preserve-lines">
                    <LinkedText text={m.body} />
                  </p>
                  <div className="chat-images">
                    {m.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={`/api/chat/media?id=${a.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {/* Private media must use the authenticated same-origin handler, never the shared image optimizer. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/chat/media?id=${a.id}`}
                          alt={
                            a.type === "image/gif"
                              ? "Shared animated GIF"
                              : "Shared image"
                          }
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                  <div className="message-actions">
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        className="reaction"
                        aria-label={`${reactionLabels[r.emoji]} ${r.count}`}
                        aria-pressed={r.mine}
                        onClick={() =>
                          void act({
                            action: "react",
                            message: m.id,
                            emoji: r.emoji,
                            active: !r.mine,
                          })
                        }
                      >
                        {reactionSymbols[r.emoji]} {r.count}
                      </button>
                    ))}
                    <button
                      className="icon-button"
                      title="React"
                      aria-label="React"
                      onClick={() =>
                        setReactionFor(reactionFor === m.id ? null : m.id)
                      }
                    >
                      <Smile size={15} />
                    </button>
                    <button
                      className="icon-button"
                      title="Reply"
                      aria-label={`Reply to ${m.name}`}
                      onClick={() => {
                        setReply(m.id);
                        input.current?.focus();
                      }}
                    >
                      <Reply size={15} />
                    </button>
                    <Link
                      className="icon-button"
                      title="Submit alpha from this message"
                      aria-label="Submit alpha from this message"
                      href={`/findings/new?room=${room}&message=${m.id}&sourceRevision=${m.revision}`}
                    >
                      <FilePlus2 size={15} />
                    </Link>
                    {m.author === memberId && (
                      <>
                        <button
                          className="icon-button"
                          title="Edit message"
                          aria-label="Edit message"
                          onClick={() => {
                            setEdit(m);
                            setEditText(m.body);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          title="Delete message"
                          aria-label="Delete message"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Delete this message? Existing alpha keeps its attributed source version.",
                              )
                            )
                              void act({
                                action: "delete",
                                message: m.id,
                                revision: m.revision,
                              });
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                  {reactionFor === m.id && (
                    <div
                      className="reaction-picker"
                      aria-label="Choose reaction"
                    >
                      {Object.entries(reactionLabels).map(([emoji, label]) => (
                        <button
                          type="button"
                          key={emoji}
                          aria-label={label}
                          title={label}
                          onClick={() =>
                            void act({
                              action: "react",
                              message: m.id,
                              emoji: emoji as keyof typeof reactionLabels,
                              active: true,
                            })
                          }
                        >
                          {
                            reactionSymbols[
                              emoji as keyof typeof reactionLabels
                            ]
                          }
                        </button>
                      ))}
                    </div>
                  )}
                  {edit?.id === m.id && (
                    <form
                      className="chat-edit"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act({
                          action: "edit",
                          message: m.id,
                          revision: m.revision,
                          body: editText,
                        });
                      }}
                    >
                      <label>
                        Edit message
                        <textarea
                          maxLength={2000}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                      </label>
                      <button className="button">Save edit</button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setEdit(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {(showJump || newCount > 0) && (
        <button
          className="jump-latest button secondary"
          onClick={() => {
            scrollLatest();
            void markRead(snapshot.messages.at(-1)?.sequence ?? 0);
          }}
        >
          <ArrowDown size={15} />
          Jump to latest{newCount > 0 ? ` (${newCount})` : ""}
        </button>
      )}
      {!canPost ? (
        <p className="notice">
          Set your name and specialty in <a href="#space-members">Members</a> to
          post.
        </p>
      ) : (
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles([...e.dataTransfer.files]);
          }}
        >
          {reply && (
            <div className="composer-context">
              Replying to{" "}
              {snapshot.messages.find((m) => m.id === reply)?.name ??
                "a message"}
              <button
                disabled={busy || !!pending}
                type="button"
                className="icon-button"
                title="Cancel reply"
                aria-label="Cancel reply"
                onClick={() => setReply(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {media.length > 0 && (
            <div className="attachment-previews">
              {media.map((m) => (
                <div key={m.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.preview ?? `/api/chat/media?id=${m.id}`}
                    alt="Attachment preview"
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove attachment"
                    title="Remove attachment"
                    disabled={busy || !!pending}
                    onClick={() =>
                      setMedia((old) => old.filter((a) => a.id !== m.id))
                    }
                  >
                    <X size={14} />
                  </button>
                  {busy && (
                    <progress
                      aria-label="Upload progress"
                      value={m.progress}
                      max={100}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <label className="sr-only" htmlFor={`compose-${room}`}>
            Message {category}
          </label>
          <textarea
            id={`compose-${room}`}
            ref={input}
            value={text}
            placeholder={`Message ${category}`}
            maxLength={2000}
            rows={2}
            disabled={busy || !!pending || denied}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                shouldSend({
                  key: e.key,
                  shiftKey: e.shiftKey,
                  isComposing: e.nativeEvent.isComposing,
                  keyCode: e.nativeEvent.keyCode,
                })
              ) {
                e.preventDefault();
                void send();
              }
            }}
            onPaste={(e) => {
              const files = [...e.clipboardData.files];
              if (files.length) {
                e.preventDefault();
                addFiles(files);
              }
            }}
          />
          <div className="composer-controls">
            <input
              ref={picker}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              aria-label="Choose images or GIFs"
              onChange={(e) => {
                addFiles([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="icon-button"
              title="Attach image or GIF"
              aria-label="Attach image or GIF"
              disabled={busy || !!pending || denied}
              onClick={() => picker.current?.click()}
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              title="Insert emoji"
              aria-label="Insert emoji"
              disabled={busy || !!pending || denied}
              onClick={() => setEmojiOpen(!emojiOpen)}
            >
              <Smile size={18} />
            </button>
            {emojiOpen && (
              <div className="emoji-picker">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`Insert ${emoji}`}
                    onClick={() => {
                      setText((t) => t + emoji);
                      setEmojiOpen(false);
                      input.current?.focus();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <button
              type="submit"
              className="button send-message"
              disabled={
                busy || denied || (!pending && !text.trim() && !media.length)
              }
            >
              <Send size={16} />
              {busy ? "Sending..." : pending ? "Retry send" : "Send"}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}

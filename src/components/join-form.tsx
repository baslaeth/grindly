"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, Mail } from "lucide-react";

async function post(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result: { error?: { message?: string }; message?: string } =
    await response.json();
  if (!response.ok)
    throw new Error(result.error?.message ?? "Request failed. Please retry.");
  return result;
}

export function JoinForm({
  available,
  pendingEmail,
}: {
  available: boolean;
  pendingEmail?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"join" | "returning">("join");
  const [sentTo, setSentTo] = useState(pendingEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !available) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (sentTo) {
        await post("/api/auth/verify", { code: data.get("code") });
        router.refresh();
      } else {
        const email = String(data.get("email") ?? "")
          .trim()
          .toLowerCase();
        const result = await post("/api/auth/otp", {
          mode,
          email,
          ...(mode === "join"
            ? { invitation: String(data.get("invitation") ?? "").trim() }
            : {}),
        });
        setSentTo(email);
        setMessage(result.message ?? "Code requested.");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Connection failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="join-form">
      {!available && (
        <p className="notice" role="status">
          Sign-in is temporarily unavailable.
        </p>
      )}
      {!sentTo && (
        <fieldset className="mode-control" disabled={busy || !available}>
          <legend className="sr-only">Account access</legend>
          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "join"}
              onChange={() => setMode("join")}
            />
            <span>Join with invitation</span>
          </label>
          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "returning"}
              onChange={() => setMode("returning")}
            />
            <span>Returning member</span>
          </label>
        </fieldset>
      )}
      <form onSubmit={submit} aria-busy={busy}>
        {sentTo ? (
          <>
            <p className="email-target">{sentTo}</p>
            <label className="field">
              Email code
              <input
                name="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                disabled={busy || !available}
              />
            </label>
          </>
        ) : (
          <>
            <label className="field">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                disabled={busy || !available}
              />
            </label>
            {mode === "join" && (
              <label className="field">
                Invitation code
                <input
                  name="invitation"
                  autoComplete="off"
                  spellCheck={false}
                  pattern="[0-9a-f]{64}"
                  minLength={64}
                  maxLength={64}
                  required
                  disabled={busy || !available}
                />
              </label>
            )}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
        <div className="form-actions">
          <button
            className="button"
            disabled={busy || !available}
            type="submit"
          >
            {sentTo ? (
              <ArrowRight size={16} aria-hidden="true" />
            ) : (
              <Mail size={16} aria-hidden="true" />
            )}
            {busy ? "Please wait..." : sentTo ? "Verify code" : "Send code"}
          </button>
          {sentTo && (
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setSentTo("");
                setError("");
                setMessage("");
              }}
            >
              Request another code
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await post("/api/auth/signout");
            router.refresh();
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Unable to sign out.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <LogOut size={16} aria-hidden="true" />
        {busy ? "Signing out..." : "Sign out"}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

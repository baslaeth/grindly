"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="section">
      <h1>Temporarily unavailable</h1>
      <p>Your submitted records have not been changed.</p>
      <button className="button" onClick={reset}>
        Retry
      </button>
    </section>
  );
}

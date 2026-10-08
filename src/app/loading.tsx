export default function Loading() {
  return (
    <div role="status" className="workspace-loading">
      <p>Loading your workspace...</p>
      <div aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

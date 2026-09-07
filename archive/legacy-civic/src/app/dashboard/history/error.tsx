"use client";
export default function HistoryError({ reset }: { reset: () => void }) {
  return <main className="history-shell"><section className="history-panel"><h1>History could not load.</h1><p>Please retry. Saved reports have not been changed.</p><button className="button-primary" onClick={reset}>Retry</button></section></main>;
}

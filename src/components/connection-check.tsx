"use client";

import { useState } from "react";

export function ConnectionCheck() {
  const [state, setState] = useState<"idle" | "checking" | "ok" | "error">("idle");

  async function checkConnection() {
    setState("checking");
    try {
      const response = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(8000) });
      const result = await response.json();
      setState(response.ok && result.status === "ok" ? "ok" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="connection-check">
      <button className="button-secondary" type="button" onClick={checkConnection} disabled={state === "checking"}>
        {state === "checking" ? "Checking…" : "Check app connection"}
        <span aria-hidden="true">↗</span>
      </button>
      <p role="status" className={state === "error" ? "connection-error" : "connection-result"}>
        {state === "ok" && "Connected. The website can reach its backend."}
        {state === "error" && "Could not reach the backend. Please try again."}
        {state === "checking" && "Contacting the application…"}
        {state === "idle" && "Check the website’s connection to its backend."}
      </p>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();

    if (!email.includes("@") || password.length < 8 || (mode === "signup" && fullName.length < 2)) {
      setMessage("Enter a valid email, a password of at least 8 characters, and your name.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });

    if (result.error) {
      setMessage(result.error.message);
      setPending(false);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm it, then sign in.");
      setPending(false);
      return;
    }

    router.push("/workspace");
    router.refresh();
  }

  return (
    <>
      <div className="auth-switch" role="group" aria-label="Authentication mode">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>Sign in</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(""); }}>Create account</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && <label>Full name<input name="fullName" autoComplete="name" minLength={2} maxLength={100} required /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label>
        <button className="button-primary auth-submit" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<span aria-hidden="true">↗</span></button>
        <p className="form-message" role="status">{message}</p>
      </form>
    </>
  );
}

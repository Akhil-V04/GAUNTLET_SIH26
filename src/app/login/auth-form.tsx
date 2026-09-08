"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function getDashboardUrl(accountType: string | undefined): string {
  switch (accountType) {
    case "student":
      return "/dashboard/student";
    case "organization_representative":
      return "/dashboard/organization";
    case "community_member":
    case "community_contributor":
      return "/dashboard/citizen";
    default:
      return "/dashboard/citizen";
  }
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [accountType, setAccountType] = useState<"community_member" | "student" | "organization_representative">("community_member");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    
    if (!email.includes("@") || password.length < 8) {
      setMessage("Enter a valid email and a password of at least 8 characters.");
      setPending(false);
      return;
    }

    const supabase = createClient();

    if (mode === "login") {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        setMessage(result.error.message);
        setPending(false);
        return;
      }

      // Determine role-based redirect
      let role = result.data.user?.user_metadata?.account_type as string | undefined;

      // If no account_type in metadata, check collab_profiles
      if (!role && result.data.user) {
        const { data: profile } = await supabase
          .from("collab_profiles")
          .select("primary_mode")
          .eq("id", result.data.user.id)
          .single();
        role = profile?.primary_mode;
      }

      router.push(getDashboardUrl(role));
      router.refresh();
      return;
    }

    // Signup specific logic
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setPending(false);
      return;
    }

    const blockedDomains = ["@gmail.com", "@yahoo.com", "@outlook.com", "@hotmail.com"];
    if (accountType === "student" || accountType === "organization_representative") {
      if (blockedDomains.some(domain => email.toLowerCase().endsWith(domain))) {
        setMessage("Please use your institutional email");
        setPending(false);
        return;
      }
    }

    const fullName = String(form.get("fullName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const orgName = String(form.get("orgName") ?? "").trim();
    const repName = String(form.get("repName") ?? "").trim();

    const metaData: Record<string, string> = {
      account_type: accountType
    };

    if (accountType === "community_member") {
      if (fullName.length < 2) {
        setMessage("Enter your full name.");
        setPending(false);
        return;
      }
      metaData.full_name = fullName;
      metaData.phone_number = phone;
    } else if (accountType === "student") {
      if (fullName.length < 2) {
        setMessage("Enter your full name.");
        setPending(false);
        return;
      }
      metaData.full_name = fullName;
    } else if (accountType === "organization_representative") {
      if (orgName.length < 2 || repName.length < 2) {
        setMessage("Enter organisation name and representative name.");
        setPending(false);
        return;
      }
      metaData.organization_name = orgName;
      metaData.full_name = repName; // Store rep name as full_name for consistency, or keep it as rep_name? The requirements say: organization_name, and representative name.
    }

    const result = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: metaData, 
        emailRedirectTo: `${window.location.origin}/auth/callback` 
      },
    });

    if (result.error) {
      setMessage(result.error.message);
      setPending(false);
      return;
    }

    if (!result.data.session) {
      setMessage("Account created. Check your email to confirm it, then sign in.");
      setPending(false);
      return;
    }

    router.push(getDashboardUrl(accountType));
    router.refresh();
  }

  return (
    <>
      <div className="auth-switch" role="group" aria-label="Authentication mode">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>Sign in</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(""); }}>Create account</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && (
          <fieldset className="account-type-picker">
            <legend className="sr-only">Choose your account type</legend>
            <div>
              <label className={accountType === "community_member" ? "selected" : ""}>
                <input 
                  type="radio" 
                  name="accountType" 
                  value="community_member" 
                  checked={accountType === "community_member"} 
                  onChange={() => setAccountType("community_member")} 
                />
                <strong>Community Member</strong>
                <span>Report societal problems and track progress</span>
              </label>
              <label className={accountType === "student" ? "selected" : ""}>
                <input 
                  type="radio" 
                  name="accountType" 
                  value="student" 
                  checked={accountType === "student"} 
                  onChange={() => setAccountType("student")} 
                />
                <strong>Student</strong>
                <span>Discover challenges, join teams and build your portfolio</span>
              </label>
              <label className={accountType === "organization_representative" ? "selected" : ""}>
                <input 
                  type="radio" 
                  name="accountType" 
                  value="organization_representative" 
                  checked={accountType === "organization_representative"} 
                  onChange={() => setAccountType("organization_representative")} 
                />
                <strong>Organisation</strong>
                <span>Adopt problems, post challenges and review student work</span>
              </label>
            </div>
          </fieldset>
        )}

        {mode === "signup" && (
          <>
            {accountType === "community_member" && (
              <>
                <label>Full name<input name="fullName" autoComplete="name" minLength={2} maxLength={100} required /></label>
                <label>Phone number<input name="phone" type="tel" autoComplete="tel" /></label>
              </>
            )}
            {accountType === "student" && (
              <label>Full name<input name="fullName" autoComplete="name" minLength={2} maxLength={100} required /></label>
            )}
            {accountType === "organization_representative" && (
              <>
                <label>Organisation name<input name="orgName" minLength={2} maxLength={100} required /></label>
                <label>Representative name<input name="repName" autoComplete="name" minLength={2} maxLength={100} required /></label>
              </>
            )}
          </>
        )}

        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        
        <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label>
        
        {mode === "signup" && (
          <label>Confirm Password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
        )}

        <button className="button-primary auth-submit" disabled={pending}>
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<span aria-hidden="true">↗</span>
        </button>
        <p className="form-message" role="status">{message}</p>
      </form>
    </>
  );
}

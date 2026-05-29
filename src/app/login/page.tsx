"use client";

import { useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/state/user";

export default function LoginPage() {
  const { email: currentEmail, signedIn, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendLink() {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setStatus("error");
      setMessage("Auth isn't configured yet. Set NEXT_PUBLIC_SUPABASE_URL / ANON_KEY.");
      return;
    }
    if (!email.trim()) return;

    setStatus("sending");
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage(`Magic link sent to ${email.trim()}. Open it on this device to sign in.`);
  }

  async function signOut() {
    const supabase = getBrowserSupabase();
    await supabase?.auth.signOut();
    setStatus("idle");
    setMessage("");
  }

  return (
    <main className="app-page mobile-shell">
      <header className="screen-header">
        <p className="eyebrow">ACCOUNT</p>
        <h1>{signedIn ? "You're signed in" : "Sign in to OOTD"}</h1>
        <p>
          {signedIn
            ? "Your wardrobe and looks are saved to your account."
            : "We'll email you a magic link — no password needed."}
        </p>
      </header>

      <section className="occasion-panel">
        {ready && signedIn ? (
          <>
            <p className="status-text">Signed in as {currentEmail}</p>
            <button className="secondary-button full-width" type="button" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="primary-button full-width"
              type="button"
              onClick={sendLink}
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </>
        )}
        {message ? <p className={`status-text${status === "error" ? " status-error" : ""}`}>{message}</p> : null}
        <p className="status-text">
          <Link href="/">← Back to home</Link>
        </p>
      </section>

      <BottomNav />
    </main>
  );
}

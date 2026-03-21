import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function Auth({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) onAuthed();
    });
    return () => sub.subscription.unsubscribe();
  }, [onAuthed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMsg("Logged in.");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. If email confirmation is on, check your inbox.");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="relative min-h-[9.5rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 px-6 py-8">
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 0%, rgba(255,255,255,0.12) 0%, transparent 42%)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-5 text-center">
            <h1
              className="font-brand text-2xl font-bold leading-tight tracking-tight drop-shadow-sm sm:text-3xl"
              style={{ color: "#bae6fd" }}
            >
              TIER
              <span
                className="ml-0.5 align-super text-[0.55em] font-bold"
                style={{
                  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                  color: "#e0f2fe",
                }}
              >
                ™
              </span>
              <span className="ml-1">CaseFlow</span>
            </h1>
            <p
              className="font-brand mx-auto max-w-[20rem] text-center text-sm font-semibold leading-snug sm:text-base"
              style={{ color: "rgba(199, 210, 254, 0.95)" }}
            >
              Investigative Workflow Platform
            </p>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-500 mb-6">
            Sign in to access your dashboard.
          </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Working..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-600">
          {mode === "login" ? (
            <button className="underline" onClick={() => setMode("signup")}>
              Need an account? Sign up
            </button>
          ) : (
            <button className="underline" onClick={() => setMode("login")}>
              Already have an account? Log in
            </button>
          )}
        </div>

        {msg && <div className="mt-4 text-sm text-slate-700">{msg}</div>}
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl p-6">
        <h1 className="text-xl font-black mb-1">Investigative Case Manager</h1>
        <p className="text-sm text-slate-600 mb-6">
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
            className="w-full rounded-xl bg-slate-900 text-white py-2 font-semibold disabled:opacity-60"
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
  );
}

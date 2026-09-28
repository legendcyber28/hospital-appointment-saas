"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error || "Login failed"); return; }
    const me = await (await fetch("/api/me")).json();
    if (me.roles.includes("SUPER_ADMIN")) router.push("/platform");
    else if (me.roles.includes("DOCTOR") && !me.roles.includes("ORGANIZATION_ADMIN")) router.push("/doctor");
    else router.push("/app");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="font-bold text-xl text-brand-700">SwasthBook</div>
          <div className="text-sm text-slate-500">Sign in to your dashboard</div>
        </div>
        <div><label className="label">Email</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></div>
        <div><label className="label">Password</label><input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "..." : "Login"}</button>
        <div className="text-xs text-slate-400 text-center">
          Demo: owner@platform.com / admin123 (platform) - admin@abc.com / demo123 (hospital)
        </div>
      </form>
    </main>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { sender: string; body: string };

export default function DemoChat({ orgs }: { orgs: { slug: string; name: string; city: string | null }[] }) {
  const [slug, setSlug] = useState(orgs[0]?.slug || "");
  const [phone, setPhone] = useState("+91 98111 22333");
  const [name, setName] = useState("Demo Patient");
  const [convId, setConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // poll for staff replies / AI silence during handoff
  useEffect(() => {
    if (!convId) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/chat/${convId}`);
      if (res.ok) {
        const d = await res.json();
        setMsgs(d.messages.map((m: { sender: string; body: string }) => ({ sender: m.sender, body: m.body })));
      }
    }, 3000);
    return () => clearInterval(t);
  }, [convId]);

  async function send() {
    if (!input.trim() || !slug) return;
    setBusy(true);
    const text = input;
    setInput("");
    setMsgs((m) => [...m, { sender: "PATIENT", body: text }]);
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug: slug, phone, name, message: text }),
    });
    const d = await res.json();
    if (res.ok) {
      setConvId(d.conversationId);
      for (const r of d.replies) setMsgs((m) => [...m, { sender: "AI", body: r }]);
    } else {
      setMsgs((m) => [...m, { sender: "AI", body: `Error: ${d.error}` }]);
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4">
      <div className="max-w-md w-full">
        <h1 className="text-xl font-bold text-center">WhatsApp Demo</h1>
        <p className="text-xs text-slate-500 text-center mb-4">
          Simulated patient chat. Try: "mujhe skin doctor chahiye" - "1" - "10:30" - "human se baat karni hai"
        </p>
        <div className="card mb-3 grid grid-cols-3 gap-2 text-sm">
          <div><label className="label">Organization</label>
            <select className="input" value={slug} onChange={(e) => { setSlug(e.target.value); setConvId(null); setMsgs([]); }}>
              {orgs.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
            </select></div>
          <div><label className="label">Your name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label">WhatsApp no.</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div className="bg-[#e5ddd5] rounded-xl border shadow-sm h-[55vh] overflow-auto p-3 space-y-2">
          {msgs.length === 0 && <div className="text-center text-xs text-slate-500 mt-8">Send a message to start. The AI replies with real doctors, fees and slots from the database.</div>}
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm ${m.sender === "PATIENT" ? "bg-[#dcf8c6] ml-auto" : m.sender === "STAFF" ? "bg-yellow-100" : "bg-white"}`}>
              {m.sender === "STAFF" && <div className="text-[10px] text-amber-700 font-medium">Hospital staff</div>}
              {m.body}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 mt-3">
          <input className="input" placeholder="Type a message..." value={input} disabled={busy}
            onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button className="btn-primary" onClick={send} disabled={busy || !input.trim()}>Send</button>
        </div>
      </div>
    </main>
  );
}

"use client";
import { useEffect, useState, useCallback, useRef } from "react";

type Conv = { id: string; mode: string; updatedAt: string; patient: { name: string; whatsappNumber: string } | null; messages: { body: string }[] };
type Msg = { id: string; sender: string; body: string; at: string };

export default function InboxClient({ canManage }: { canManage: boolean }) {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [mode, setMode] = useState("AI");
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    const res = await fetch("/api/org/conversations");
    if (res.ok) setConvs((await res.json()).conversations);
  }, []);
  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 5000); return () => clearInterval(t); }, [loadConvs]);

  const loadMsgs = useCallback(async () => {
    if (!active) return;
    const res = await fetch(`/api/org/conversations/${active}`);
    if (res.ok) {
      const d = await res.json();
      setMsgs(d.conversation.messages);
      setMode(d.conversation.mode);
    }
  }, [active]);
  useEffect(() => { loadMsgs(); const t = setInterval(loadMsgs, 3000); return () => clearInterval(t); }, [loadMsgs]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function act(action: string, body?: string) {
    await fetch(`/api/org/conversations/${active}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, body }) });
    setReply("");
    loadMsgs(); loadConvs();
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-4">WhatsApp Inbox</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card space-y-2 max-h-[70vh] overflow-auto">
          {convs.length === 0 && <p className="text-sm text-slate-500">No conversations yet. Try the WhatsApp demo.</p>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)}
              className={`w-full text-left rounded-lg p-3 border ${active === c.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{c.patient?.name || "Unknown"}</span>
                <span className={`badge ${c.mode === "HUMAN" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{c.mode === "HUMAN" ? "Needs human" : "AI"}</span>
              </div>
              <div className="text-xs text-slate-400">{c.patient?.whatsappNumber}</div>
              <div className="text-xs text-slate-500 truncate mt-1">{c.messages[0]?.body}</div>
            </button>
          ))}
        </div>
        <div className="card md:col-span-2 flex flex-col max-h-[70vh]">
          {!active ? <p className="text-sm text-slate-500">Select a conversation.</p> : (
            <>
              <div className="flex gap-2 pb-3 border-b">
                {canManage && mode === "AI" && <button className="btn-ghost text-xs" onClick={() => act("takeover")}>Take over conversation</button>}
                {canManage && mode === "HUMAN" && <button className="btn-ghost text-xs" onClick={() => act("release")}>Return to AI</button>}
                {canManage && <button className="btn-ghost text-xs" onClick={() => { act("close"); setActive(null); }}>Close</button>}
                <span className={`badge self-center ${mode === "HUMAN" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{mode}</span>
              </div>
              <div className="flex-1 overflow-auto py-3 space-y-2">
                {msgs.map((m) => (
                  <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.sender === "PATIENT" ? "bg-slate-100" : m.sender === "AI" ? "bg-brand-50 ml-auto" : "bg-green-100 ml-auto"}`}>
                    <div className="text-[10px] text-slate-400 mb-0.5">{m.sender}</div>
                    {m.body}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {mode === "HUMAN" && canManage && (
                <div className="flex gap-2 pt-3 border-t">
                  <input className="input" placeholder="Reply as staff..." value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && reply && act("reply", reply)} />
                  <button className="btn-primary" disabled={!reply} onClick={() => act("reply", reply)}>Send</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
